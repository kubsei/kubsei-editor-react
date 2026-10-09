/**
 * Stroke Processing Web Worker
 *
 * Ejecuta operaciones CPU-intensive fuera del main thread:
 * - Encoding de strokes (raw → binary)
 * - Decoding de strokes (binary → points)
 * - Serialización para backend (binary → Base64)
 *
 * IMPORTANTE: Este Worker NO accede al DOM ni a Redux.
 * Solo procesa datos y devuelve resultados.
 */

// ============ INLINE CODEC (Worker no puede importar módulos externos fácilmente) ============

// Constantes
const STROKE_BUFFER_HEADER_SIZE = 20;
const STROKE_BUFFER_VERSION = 1;
const STROKE_POINT_SIZE = 5;
const STROKE_FLAGS = {
  HAS_PRESSURE: 0x0001,
} as const;
const QUANTIZATION = {
  POSITION_SCALE: 10,
  PRESSURE_SCALE_ORIGIN: 65535,
  PRESSURE_SCALE_DELTA: 127,
} as const;

// Types (duplicados aquí porque Workers no pueden importar fácilmente)
interface RawStrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp?: number;
}

interface StrokeMetadata {
  id: string;
  layerId: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  tension: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  globalCompositeOperation: GlobalCompositeOperation;
  pointCount: number;
  bufferVersion: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  createdAt: number;
  hasPressure: boolean;
}

interface RawStroke {
  id: string;
  points: RawStrokePoint[];
  metadata: StrokeMetadata;
}

interface OptimizedStroke {
  metadata: StrokeMetadata;
  buffer: ArrayBuffer;
}

interface SerializedStroke {
  metadata: StrokeMetadata;
  bufferBase64: string;
}

interface DecodedStrokeData {
  flatPoints: number[];
  pressures: number[];
}

// ============ CODEC FUNCTIONS ============

function calculateBounds(points: RawStrokePoint[]): StrokeMetadata['bounds'] {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const { x, y } = points[i];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

function hasRealPressure(points: RawStrokePoint[]): boolean {
  const DEFAULT_PRESSURE = 0.5;
  const TOLERANCE = 0.01;

  for (const point of points) {
    if (Math.abs(point.pressure - DEFAULT_PRESSURE) > TOLERANCE) {
      return true;
    }
  }

  return false;
}

function encodeStroke(rawStroke: RawStroke): OptimizedStroke {
  const { points, metadata } = rawStroke;

  if (points.length === 0) {
    throw new Error('Cannot encode empty stroke');
  }

  const bounds = calculateBounds(points);
  const hasPressure = hasRealPressure(points);

  const bufferSize = STROKE_BUFFER_HEADER_SIZE + (points.length - 1) * STROKE_POINT_SIZE;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  let offset = 0;

  // Header
  dataView.setUint16(offset, STROKE_BUFFER_VERSION, true);
  offset += 2;

  let flags = 0;
  if (hasPressure) flags |= STROKE_FLAGS.HAS_PRESSURE;
  dataView.setUint16(offset, flags, true);
  offset += 2;

  dataView.setUint32(offset, points.length, true);
  offset += 4;

  const originX = points[0].x;
  dataView.setFloat32(offset, originX, true);
  offset += 4;

  const originY = points[0].y;
  dataView.setFloat32(offset, originY, true);
  offset += 4;

  const originPressure = Math.round(points[0].pressure * QUANTIZATION.PRESSURE_SCALE_ORIGIN);
  dataView.setUint16(offset, Math.min(65535, Math.max(0, originPressure)), true);
  offset += 2;

  dataView.setUint16(offset, 0, true);
  offset += 2;

  // Delta points
  let prevX = originX;
  let prevY = originY;
  let prevPressure = points[0].pressure;

  for (let i = 1; i < points.length; i++) {
    const point = points[i];

    const deltaX = Math.round((point.x - prevX) * QUANTIZATION.POSITION_SCALE);
    const clampedDeltaX = Math.max(-32768, Math.min(32767, deltaX));
    dataView.setInt16(offset, clampedDeltaX, true);
    offset += 2;

    const deltaY = Math.round((point.y - prevY) * QUANTIZATION.POSITION_SCALE);
    const clampedDeltaY = Math.max(-32768, Math.min(32767, deltaY));
    dataView.setInt16(offset, clampedDeltaY, true);
    offset += 2;

    const deltaPressure = Math.round(
      (point.pressure - prevPressure) * QUANTIZATION.PRESSURE_SCALE_DELTA
    );
    const clampedDeltaPressure = Math.max(-128, Math.min(127, deltaPressure));
    uint8View[offset] = clampedDeltaPressure & 0xff;
    offset += 1;

    prevX += clampedDeltaX / QUANTIZATION.POSITION_SCALE;
    prevY += clampedDeltaY / QUANTIZATION.POSITION_SCALE;
    prevPressure += clampedDeltaPressure / QUANTIZATION.PRESSURE_SCALE_DELTA;
  }

  const updatedMetadata: StrokeMetadata = {
    ...metadata,
    pointCount: points.length,
    bufferVersion: STROKE_BUFFER_VERSION,
    bounds,
    hasPressure,
    createdAt: metadata.createdAt || Date.now(),
  };

  return {
    metadata: updatedMetadata,
    buffer,
  };
}

function decodeStroke(buffer: ArrayBuffer): DecodedStrokeData {
  const dataView = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  let offset = 0;

  // Header
  offset += 2; // version
  offset += 2; // flags

  const pointCount = dataView.getUint32(offset, true);
  offset += 4;

  const originX = dataView.getFloat32(offset, true);
  offset += 4;

  const originY = dataView.getFloat32(offset, true);
  offset += 4;

  const originPressure = dataView.getUint16(offset, true) / QUANTIZATION.PRESSURE_SCALE_ORIGIN;
  offset += 2;

  offset += 2; // reserved

  const flatPoints: number[] = new Array(pointCount * 2);
  const pressures: number[] = new Array(pointCount);

  flatPoints[0] = originX;
  flatPoints[1] = originY;
  pressures[0] = originPressure;

  let currentX = originX;
  let currentY = originY;
  let currentPressure = originPressure;

  for (let i = 1; i < pointCount; i++) {
    const deltaX = dataView.getInt16(offset, true);
    offset += 2;

    const deltaY = dataView.getInt16(offset, true);
    offset += 2;

    let deltaPressure = uint8View[offset];
    if (deltaPressure > 127) deltaPressure -= 256;
    offset += 1;

    currentX += deltaX / QUANTIZATION.POSITION_SCALE;
    currentY += deltaY / QUANTIZATION.POSITION_SCALE;
    currentPressure += deltaPressure / QUANTIZATION.PRESSURE_SCALE_DELTA;
    currentPressure = Math.max(0, Math.min(1, currentPressure));

    flatPoints[i * 2] = currentX;
    flatPoints[i * 2 + 1] = currentY;
    pressures[i] = currentPressure;
  }

  return { flatPoints, pressures };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============ WORKER MESSAGE HANDLER ============

interface WorkerMessage {
  type: string;
  payload: unknown;
  requestId: string;
}

self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, payload, requestId } = event.data;

  try {
    switch (type) {
      case 'encode': {
        const rawStroke = payload as RawStroke;
        const optimized = encodeStroke(rawStroke);

        // Transferir el buffer (más eficiente que copiar)
        self.postMessage(
          { type: 'encoded', payload: optimized, requestId },
          { transfer: [optimized.buffer] }
        );
        break;
      }

      case 'decode': {
        const { buffer } = payload as { buffer: ArrayBuffer };
        const decoded = decodeStroke(buffer);

        self.postMessage({ type: 'decoded', payload: decoded, requestId });
        break;
      }

      case 'batch-encode': {
        const rawStrokes = payload as RawStroke[];
        const optimizedStrokes: OptimizedStroke[] = [];
        const transfers: ArrayBuffer[] = [];

        for (const rawStroke of rawStrokes) {
          const optimized = encodeStroke(rawStroke);
          optimizedStrokes.push(optimized);
          transfers.push(optimized.buffer);
        }

        self.postMessage(
          { type: 'batch-encoded', payload: optimizedStrokes, requestId },
          { transfer: transfers }
        );
        break;
      }

      case 'serialize': {
        const stroke = payload as OptimizedStroke;
        const serialized: SerializedStroke = {
          metadata: stroke.metadata,
          bufferBase64: arrayBufferToBase64(stroke.buffer),
        };

        self.postMessage({ type: 'serialized', payload: serialized, requestId });
        break;
      }

      case 'deserialize': {
        const serialized = payload as SerializedStroke;
        const buffer = base64ToArrayBuffer(serialized.bufferBase64);
        const optimized: OptimizedStroke = {
          metadata: serialized.metadata,
          buffer,
        };

        self.postMessage(
          { type: 'deserialized', payload: optimized, requestId },
          { transfer: [optimized.buffer] }
        );
        break;
      }

      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${type}`,
          requestId,
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    });
  }
};

// TypeScript: indicar que esto es un módulo Worker
export {};
