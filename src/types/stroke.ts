/**
 * Binary Stroke Types
 *
 * Sistema de strokes optimizado para aplicaciones de dibujo profesional.
 * Usa compresión sin pérdida mediante:
 * - Delta encoding entre puntos consecutivos
 * - Cuantización controlada (Int16 para posición, Int8 para presión)
 * - Formato binario (ArrayBuffer / TypedArray)
 *
 * REGLAS:
 * - NO se eliminan puntos
 * - NO se usa simplificación destructiva
 * - Fidelidad artística total
 */

// ============ RAW CAPTURE TYPES ============

/**
 * Punto crudo capturado durante el stroke
 * Este es el formato de entrada antes de la optimización
 */
export interface RawStrokePoint {
  x: number;        // Posición X absoluta en canvas
  y: number;        // Posición Y absoluta en canvas
  pressure: number; // Presión del stylus (0-1)
  timestamp?: number; // Opcional: para análisis de velocidad
}

/**
 * Stroke crudo antes de optimización
 * Se acumula durante el drawing y se envía al Worker al finalizar
 */
export interface RawStroke {
  id: string;
  points: RawStrokePoint[];
  metadata: StrokeMetadata;
}

// ============ METADATA TYPES ============

/**
 * Metadata del stroke que se almacena junto con el buffer
 * NO va dentro del buffer binario
 */
export interface StrokeMetadata {
  // Identificación
  id: string;
  layerId: string;

  // Propiedades de renderizado
  stroke: string;           // Color del trazo
  strokeWidth: number;      // Ancho base del trazo
  opacity: number;          // Opacidad del stroke
  tension: number;          // Tensión de la curva (0-1)
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  globalCompositeOperation: GlobalCompositeOperation;

  // Información del buffer
  pointCount: number;       // Número de puntos
  bufferVersion: number;    // Versión del formato (para migración futura)

  // Bounding box (para culling en render)
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  // Timestamps
  createdAt: number;

  // Flags
  hasPressure: boolean;     // Si el stroke tiene datos de presión reales
}

// ============ BINARY FORMAT TYPES ============

/**
 * Header del buffer binario
 *
 * Layout (20 bytes total):
 * - [0-1]   version: Uint16     - Versión del formato
 * - [2-3]   flags: Uint16       - Flags (hasPressure, etc)
 * - [4-7]   pointCount: Uint32  - Número de puntos
 * - [8-11]  originX: Float32    - X del primer punto (absoluto)
 * - [12-15] originY: Float32    - Y del primer punto (absoluto)
 * - [16-17] originPressure: Uint16 - Presión del primer punto (0-65535)
 * - [18-19] reserved: Uint16    - Reservado para futuro uso
 */
export const STROKE_BUFFER_HEADER_SIZE = 20;
export const STROKE_BUFFER_VERSION = 1;

/**
 * Flags del buffer
 */
export const STROKE_FLAGS = {
  HAS_PRESSURE: 0x0001,
  HAS_TIMESTAMP: 0x0002, // Reservado para futuro
} as const;

/**
 * Tamaño de cada punto en el buffer (después del primero)
 *
 * Layout por punto (5 bytes):
 * - [0-1] deltaX: Int16    - Delta X desde punto anterior
 * - [2-3] deltaY: Int16    - Delta Y desde punto anterior
 * - [4]   deltaPressure: Int8 - Delta presión desde punto anterior
 *
 * Nota: Int16 permite deltas de ±32,767 pixels entre puntos consecutivos
 * Para strokes normales esto es más que suficiente
 */
export const STROKE_POINT_SIZE = 5;

/**
 * Factores de escala para cuantización
 */
export const QUANTIZATION = {
  // Posición: 1 unidad = 0.1 pixel (10x precisión)
  // Esto permite representar posiciones con precisión de 0.1px
  // Rango efectivo con Int16: ±3,276.7 pixels de delta
  POSITION_SCALE: 10,

  // Presión: mapea 0-1 a 0-65535 para el origen,
  // y deltas con Int8 (-128 a 127) escalados
  PRESSURE_SCALE_ORIGIN: 65535,
  PRESSURE_SCALE_DELTA: 127,
} as const;

// ============ OPTIMIZED STROKE TYPES ============

/**
 * Stroke optimizado con buffer binario
 * Este es el formato que se almacena en Redux y se envía al backend
 */
export interface OptimizedStroke {
  metadata: StrokeMetadata;
  buffer: ArrayBuffer;  // Buffer binario con puntos delta-encoded
}

/**
 * Stroke serializado para persistencia (JSON-compatible)
 * El buffer se convierte a Base64 para enviar al backend
 */
export interface SerializedStroke {
  metadata: StrokeMetadata;
  bufferBase64: string;
}

// ============ WORKER MESSAGE TYPES ============

/**
 * Mensajes enviados al Worker
 */
export type StrokeWorkerRequest =
  | { type: 'encode'; payload: RawStroke }
  | { type: 'decode'; payload: { metadata: StrokeMetadata; buffer: ArrayBuffer } }
  | { type: 'batch-encode'; payload: RawStroke[] }
  | { type: 'serialize'; payload: OptimizedStroke }
  | { type: 'deserialize'; payload: SerializedStroke };

/**
 * Mensajes recibidos del Worker
 */
export type StrokeWorkerResponse =
  | { type: 'encoded'; payload: OptimizedStroke; requestId: string }
  | { type: 'decoded'; payload: RawStrokePoint[]; requestId: string }
  | { type: 'batch-encoded'; payload: OptimizedStroke[]; requestId: string }
  | { type: 'serialized'; payload: SerializedStroke; requestId: string }
  | { type: 'deserialized'; payload: OptimizedStroke; requestId: string }
  | { type: 'error'; error: string; requestId: string };

// ============ DRAWING ELEMENT WITH BUFFER ============

/**
 * Elemento de dibujo con buffer binario
 * Extiende el DrawingElement original para soportar el nuevo formato
 */
export interface BinaryDrawingElement {
  id: string;
  type: 'drawing';

  // Transform (heredado de BaseElement)
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;

  // Stroke properties
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  globalCompositeOperation: GlobalCompositeOperation;

  // Binary data
  strokeBuffer: ArrayBuffer | null;  // Buffer binario (null durante drawing)
  pointCount: number;
  hasPressure: boolean;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  // Legacy support: puntos temporales durante drawing activo
  // Se eliminan y reemplazan por strokeBuffer al finalizar
  _tempPoints?: number[];
}

// ============ UTILITY TYPES ============

/**
 * Resultado de la decodificación para rendering
 */
export interface DecodedStrokeData {
  // Array plano [x1, y1, x2, y2, ...] para Konva Line
  flatPoints: number[];
  // Presiones por punto para brush engine
  pressures: number[];
}

/**
 * Configuración del codec
 */
export interface StrokeCodecConfig {
  // Si true, incluye presión en el encoding
  includePressure: boolean;
  // Precisión de posición (default: QUANTIZATION.POSITION_SCALE)
  positionScale?: number;
}

/**
 * Estadísticas de compresión (para debugging/analytics)
 */
export interface CompressionStats {
  rawSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  pointCount: number;
  avgDeltaX: number;
  avgDeltaY: number;
}
