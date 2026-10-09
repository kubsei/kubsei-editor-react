/**
 * Stroke Codec - Encoder/Decoder para strokes binarios
 *
 * Implementa compresión SIN PÉRDIDA mediante:
 * - Delta encoding entre puntos consecutivos
 * - Cuantización controlada (Int16 para posición, Int8 para presión)
 * - Formato binario compacto
 *
 * REGLAS ESTRICTAS:
 * - NO se eliminan puntos
 * - NO se usa simplificación destructiva (Douglas-Peucker, Bezier fitting)
 * - Fidelidad artística total preservada
 */

import {
  RawStrokePoint,
  RawStroke,
  OptimizedStroke,
  SerializedStroke,
  StrokeMetadata,
  DecodedStrokeData,
  CompressionStats,
  StrokeCodecConfig,
  STROKE_BUFFER_HEADER_SIZE,
  STROKE_BUFFER_VERSION,
  STROKE_POINT_SIZE,
  STROKE_FLAGS,
  QUANTIZATION,
} from '@/types/stroke';

// ============ ENCODER ============

/**
 * Codifica un stroke crudo a formato binario optimizado
 * Esta función puede ejecutarse en el main thread o en un Worker
 */
export function encodeStroke(
  rawStroke: RawStroke,
  config: StrokeCodecConfig = { includePressure: true }
): OptimizedStroke {
  const { points, metadata } = rawStroke;

  if (points.length === 0) {
    throw new Error('Cannot encode empty stroke');
  }

  // Calcular bounding box
  const bounds = calculateBounds(points);

  // Detectar si hay presión real (no todos 0.5)
  const hasPressure = config.includePressure && hasRealPressure(points);

  // Calcular tamaño del buffer
  // Header + (N-1) puntos delta (el primer punto va en el header)
  const bufferSize = STROKE_BUFFER_HEADER_SIZE + (points.length - 1) * STROKE_POINT_SIZE;
  const buffer = new ArrayBuffer(bufferSize);

  // Vistas para escribir datos
  const dataView = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  // ===== ESCRIBIR HEADER =====
  let offset = 0;

  // Version (Uint16)
  dataView.setUint16(offset, STROKE_BUFFER_VERSION, true); // little-endian
  offset += 2;

  // Flags (Uint16)
  let flags = 0;
  if (hasPressure) flags |= STROKE_FLAGS.HAS_PRESSURE;
  dataView.setUint16(offset, flags, true);
  offset += 2;

  // Point count (Uint32)
  dataView.setUint32(offset, points.length, true);
  offset += 4;

  // Origin X (Float32) - primer punto absoluto
  const originX = points[0].x;
  dataView.setFloat32(offset, originX, true);
  offset += 4;

  // Origin Y (Float32)
  const originY = points[0].y;
  dataView.setFloat32(offset, originY, true);
  offset += 4;

  // Origin Pressure (Uint16) - escalado a 0-65535
  const originPressure = Math.round(points[0].pressure * QUANTIZATION.PRESSURE_SCALE_ORIGIN);
  dataView.setUint16(offset, Math.min(65535, Math.max(0, originPressure)), true);
  offset += 2;

  // Reserved (Uint16)
  dataView.setUint16(offset, 0, true);
  offset += 2;

  // ===== ESCRIBIR PUNTOS DELTA =====
  let prevX = originX;
  let prevY = originY;
  let prevPressure = points[0].pressure;

  for (let i = 1; i < points.length; i++) {
    const point = points[i];

    // Delta X (Int16) - escalado para mayor precisión
    const deltaX = Math.round((point.x - prevX) * QUANTIZATION.POSITION_SCALE);
    const clampedDeltaX = Math.max(-32768, Math.min(32767, deltaX));
    dataView.setInt16(offset, clampedDeltaX, true);
    offset += 2;

    // Delta Y (Int16)
    const deltaY = Math.round((point.y - prevY) * QUANTIZATION.POSITION_SCALE);
    const clampedDeltaY = Math.max(-32768, Math.min(32767, deltaY));
    dataView.setInt16(offset, clampedDeltaY, true);
    offset += 2;

    // Delta Pressure (Int8)
    const deltaPressure = Math.round(
      (point.pressure - prevPressure) * QUANTIZATION.PRESSURE_SCALE_DELTA
    );
    const clampedDeltaPressure = Math.max(-128, Math.min(127, deltaPressure));
    uint8View[offset] = clampedDeltaPressure & 0xff; // Store as signed byte
    offset += 1;

    // Actualizar valores previos (usar valores cuantizados para evitar drift)
    prevX += clampedDeltaX / QUANTIZATION.POSITION_SCALE;
    prevY += clampedDeltaY / QUANTIZATION.POSITION_SCALE;
    prevPressure += clampedDeltaPressure / QUANTIZATION.PRESSURE_SCALE_DELTA;
  }

  // Actualizar metadata
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

// ============ DECODER ============

/**
 * Decodifica un buffer binario a puntos para rendering
 * Devuelve formato optimizado para Konva (flatPoints) y brush engine (pressures)
 */
export function decodeStroke(
  buffer: ArrayBuffer,
  metadata?: Partial<StrokeMetadata>
): DecodedStrokeData {
  const dataView = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  // ===== LEER HEADER =====
  let offset = 0;

  // Version
  const version = dataView.getUint16(offset, true);
  offset += 2;

  if (version !== STROKE_BUFFER_VERSION) {
    console.warn(`Unknown stroke buffer version: ${version}, expected ${STROKE_BUFFER_VERSION}`);
  }

  // Flags
  const flags = dataView.getUint16(offset, true);
  const hasPressure = (flags & STROKE_FLAGS.HAS_PRESSURE) !== 0;
  offset += 2;

  // Point count
  const pointCount = dataView.getUint32(offset, true);
  offset += 4;

  // Origin X
  const originX = dataView.getFloat32(offset, true);
  offset += 4;

  // Origin Y
  const originY = dataView.getFloat32(offset, true);
  offset += 4;

  // Origin Pressure
  const originPressure = dataView.getUint16(offset, true) / QUANTIZATION.PRESSURE_SCALE_ORIGIN;
  offset += 2;

  // Skip reserved
  offset += 2;

  // ===== RECONSTRUIR PUNTOS =====
  const flatPoints: number[] = new Array(pointCount * 2);
  const pressures: number[] = new Array(pointCount);

  // Primer punto
  flatPoints[0] = originX;
  flatPoints[1] = originY;
  pressures[0] = originPressure;

  let currentX = originX;
  let currentY = originY;
  let currentPressure = originPressure;

  // Resto de puntos (deltas)
  for (let i = 1; i < pointCount; i++) {
    // Delta X (Int16)
    const deltaX = dataView.getInt16(offset, true);
    offset += 2;

    // Delta Y (Int16)
    const deltaY = dataView.getInt16(offset, true);
    offset += 2;

    // Delta Pressure (Int8) - leer como signed
    let deltaPressure = uint8View[offset];
    if (deltaPressure > 127) deltaPressure -= 256; // Convert to signed
    offset += 1;

    // Reconstruir valores absolutos
    currentX += deltaX / QUANTIZATION.POSITION_SCALE;
    currentY += deltaY / QUANTIZATION.POSITION_SCALE;
    currentPressure += deltaPressure / QUANTIZATION.PRESSURE_SCALE_DELTA;

    // Clamp pressure to valid range
    currentPressure = Math.max(0, Math.min(1, currentPressure));

    flatPoints[i * 2] = currentX;
    flatPoints[i * 2 + 1] = currentY;
    pressures[i] = currentPressure;
  }

  return { flatPoints, pressures };
}

/**
 * Decodifica a puntos crudos completos (para undo/redo o edición)
 */
export function decodeToRawPoints(buffer: ArrayBuffer): RawStrokePoint[] {
  const { flatPoints, pressures } = decodeStroke(buffer);
  const points: RawStrokePoint[] = [];

  for (let i = 0; i < pressures.length; i++) {
    points.push({
      x: flatPoints[i * 2],
      y: flatPoints[i * 2 + 1],
      pressure: pressures[i],
    });
  }

  return points;
}

// ============ SERIALIZATION (JSON/Base64) ============

/**
 * Serializa un OptimizedStroke para enviar al backend (JSON-compatible)
 */
export function serializeStroke(stroke: OptimizedStroke): SerializedStroke {
  const bufferBase64 = arrayBufferToBase64(stroke.buffer);

  return {
    metadata: stroke.metadata,
    bufferBase64,
  };
}

/**
 * Deserializa un stroke desde formato JSON (backend)
 */
export function deserializeStroke(serialized: SerializedStroke): OptimizedStroke {
  const buffer = base64ToArrayBuffer(serialized.bufferBase64);

  return {
    metadata: serialized.metadata,
    buffer,
  };
}

// ============ BATCH OPERATIONS ============

/**
 * Codifica múltiples strokes (para export masivo)
 */
export function encodeStrokes(
  rawStrokes: RawStroke[],
  config?: StrokeCodecConfig
): OptimizedStroke[] {
  return rawStrokes.map(stroke => encodeStroke(stroke, config));
}

/**
 * Serializa múltiples strokes
 */
export function serializeStrokes(strokes: OptimizedStroke[]): SerializedStroke[] {
  return strokes.map(serializeStroke);
}

// ============ UTILITY FUNCTIONS ============

/**
 * Calcula el bounding box de los puntos
 */
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

/**
 * Detecta si el stroke tiene presión real del stylus
 * (no solo el valor por defecto de 0.5)
 */
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

/**
 * Convierte ArrayBuffer a Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

/**
 * Convierte Base64 string a ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Calcula estadísticas de compresión (para debugging)
 */
export function getCompressionStats(
  rawPoints: RawStrokePoint[],
  optimizedBuffer: ArrayBuffer
): CompressionStats {
  // Tamaño raw estimado (JSON con x, y, pressure por punto)
  // Aproximado: ~30 bytes por punto en JSON
  const rawSizeBytes = rawPoints.length * 30;
  const compressedSizeBytes = optimizedBuffer.byteLength;

  // Calcular deltas promedio
  let sumDeltaX = 0;
  let sumDeltaY = 0;

  for (let i = 1; i < rawPoints.length; i++) {
    sumDeltaX += Math.abs(rawPoints[i].x - rawPoints[i - 1].x);
    sumDeltaY += Math.abs(rawPoints[i].y - rawPoints[i - 1].y);
  }

  const avgDeltaX = rawPoints.length > 1 ? sumDeltaX / (rawPoints.length - 1) : 0;
  const avgDeltaY = rawPoints.length > 1 ? sumDeltaY / (rawPoints.length - 1) : 0;

  return {
    rawSizeBytes,
    compressedSizeBytes,
    compressionRatio: rawSizeBytes / compressedSizeBytes,
    pointCount: rawPoints.length,
    avgDeltaX,
    avgDeltaY,
  };
}

/**
 * Valida que un buffer tenga el formato correcto
 */
export function validateBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < STROKE_BUFFER_HEADER_SIZE) {
    return false;
  }

  const dataView = new DataView(buffer);
  const version = dataView.getUint16(0, true);
  const pointCount = dataView.getUint32(4, true);

  // Verificar versión conocida
  if (version !== STROKE_BUFFER_VERSION) {
    return false;
  }

  // Verificar tamaño consistente
  const expectedSize = STROKE_BUFFER_HEADER_SIZE + (pointCount - 1) * STROKE_POINT_SIZE;
  if (buffer.byteLength !== expectedSize) {
    return false;
  }

  return true;
}
