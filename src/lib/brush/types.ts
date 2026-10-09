/**
 * Brush Engine Types
 *
 * Sistema de pinceles profesional estilo manga/ilustración.
 * Soporta presión, velocidad, suavizado y texturas.
 */

// ============ POINT TYPES ============

/**
 * Punto de entrada crudo del stylus
 */
export interface InputPoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

/**
 * Punto procesado con datos calculados
 */
export interface ProcessedPoint extends InputPoint {
  // Velocidad calculada (pixels/ms)
  velocity: number;
  // Dirección del trazo (radianes)
  angle: number;
  // Distancia desde el punto anterior
  distance: number;
  // Ancho calculado para este punto
  width: number;
}

/**
 * Punto suavizado listo para rendering
 */
export interface SmoothedPoint {
  x: number;
  y: number;
  pressure: number;
  width: number;
  // Puntos de control para curva Bézier (opcional)
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };
}

// ============ BRUSH CONFIGURATION ============

/**
 * Configuración de un pincel
 */
export interface BrushConfig {
  // Identificación
  id: string;
  name: string;
  type: BrushType;

  // Tamaño
  size: {
    base: number;        // Tamaño base en pixels
    min: number;         // Mínimo (como factor 0-1)
    max: number;         // Máximo (como factor 0-1)
  };

  // Respuesta a presión
  pressure: {
    enabled: boolean;
    curve: PressureCurve;
    sensitivity: number;  // 0-2, donde 1 es normal
    minOutput: number;    // Output mínimo cuando pressure=0
  };

  // Respuesta a velocidad
  velocity: {
    enabled: boolean;
    influence: number;    // 0-1, cuánto afecta al grosor
    thinning: number;     // Cuánto adelgaza a alta velocidad
  };

  // Suavizado
  smoothing: {
    enabled: boolean;
    type: SmoothingType;
    strength: number;     // 0-1
  };

  // Stabilizer (lazy brush)
  stabilizer: {
    enabled: boolean;
    strength: number;     // 0-1, delay del trazo
    catchUp: boolean;     // Si el trazo alcanza al cursor al soltar
  };

  // Textura
  texture: {
    enabled: boolean;
    type: TextureType;
    intensity: number;    // 0-1
    scale: number;        // Escala del patrón
  };

  // Opacidad
  opacity: {
    base: number;         // 0-1
    pressureAffects: boolean;
    flowMode: boolean;    // Si usa flow en lugar de opacity
  };

  // Forma del trazo
  stroke: {
    lineCap: 'butt' | 'round' | 'square';
    lineJoin: 'miter' | 'round' | 'bevel';
    taper: {
      start: number;      // 0-1, adelgazamiento al inicio
      end: number;        // 0-1, adelgazamiento al final
    };
  };
}

export type BrushType =
  | 'pencil'      // Lápiz con textura de grano
  | 'pen'         // Pluma limpia tipo G-Pen
  | 'ink'         // Tinta con variación
  | 'marker'      // Marcador suave
  | 'brush'       // Pincel artístico
  | 'airbrush';   // Aerógrafo difuso

export type PressureCurve =
  | 'linear'      // Respuesta lineal
  | 'soft'        // Más sensible a presión ligera
  | 'hard'        // Requiere más presión para grosor
  | 'sCurve';     // Curva S, suave en extremos

export type SmoothingType =
  | 'none'
  | 'catmullRom'  // Spline Catmull-Rom
  | 'bezier'      // Curvas Bézier
  | 'average';    // Promedio de puntos

export type TextureType =
  | 'none'
  | 'pencil'      // Grano de lápiz/carboncillo
  | 'paper'       // Textura de papel
  | 'noise';      // Ruido aleatorio

// ============ STROKE DATA ============

/**
 * Datos de un trazo procesado listo para rendering
 */
export interface ProcessedStroke {
  id: string;
  points: SmoothedPoint[];
  color: string;
  brushConfig: BrushConfig;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * Datos para el preview temporal durante dibujo
 */
export interface StrokePreview {
  points: SmoothedPoint[];
  color: string;
  opacity: number;
  isActive: boolean;
}

// ============ BRUSH ENGINE STATE ============

/**
 * Estado interno del brush engine
 */
export interface BrushEngineState {
  isDrawing: boolean;
  currentStrokeId: string | null;
  rawPoints: InputPoint[];
  processedPoints: ProcessedPoint[];
  smoothedPoints: SmoothedPoint[];
  lastPoint: InputPoint | null;
  stabilizer: {
    buffer: InputPoint[];
    targetPoint: InputPoint | null;
  };
}

// ============ PRESET BRUSHES ============

/**
 * Nombres de presets disponibles
 */
export type BrushPreset = 'mangaPencil' | 'gPen' | 'marker';

/**
 * Presets de pinceles comunes
 */
export const BRUSH_PRESETS: Record<BrushPreset, Partial<BrushConfig>> = {
  // Lápiz manga estilo Clip Studio
  mangaPencil: {
    name: 'Manga Pencil',
    type: 'pencil',
    size: { base: 4, min: 0.2, max: 1.0 },
    pressure: {
      enabled: true,
      curve: 'soft',
      sensitivity: 1.2,
      minOutput: 0.1,
    },
    velocity: {
      enabled: true,
      influence: 0.3,
      thinning: 0.5,
    },
    smoothing: {
      enabled: true,
      type: 'catmullRom',
      strength: 0.5,
    },
    stabilizer: {
      enabled: true,
      strength: 0.3,
      catchUp: true,
    },
    texture: {
      enabled: true,
      type: 'pencil',
      intensity: 0.4,
      scale: 1,
    },
    stroke: {
      lineCap: 'round',
      lineJoin: 'round',
      taper: { start: 0.3, end: 0.5 },
    },
  },

  // G-Pen para entintado
  gPen: {
    name: 'G-Pen',
    type: 'pen',
    size: { base: 3, min: 0.1, max: 1.5 },
    pressure: {
      enabled: true,
      curve: 'sCurve',
      sensitivity: 1.0,
      minOutput: 0.05,
    },
    velocity: {
      enabled: true,
      influence: 0.2,
      thinning: 0.3,
    },
    smoothing: {
      enabled: true,
      type: 'bezier',
      strength: 0.6,
    },
    stabilizer: {
      enabled: true,
      strength: 0.4,
      catchUp: true,
    },
    texture: {
      enabled: false,
      type: 'none',
      intensity: 0,
      scale: 1,
    },
    stroke: {
      lineCap: 'round',
      lineJoin: 'round',
      taper: { start: 0.5, end: 0.7 },
    },
  },

  // Marcador suave
  marker: {
    name: 'Marker',
    type: 'marker',
    size: { base: 8, min: 0.8, max: 1.2 },
    pressure: {
      enabled: true,
      curve: 'linear',
      sensitivity: 0.5,
      minOutput: 0.7,
    },
    velocity: {
      enabled: false,
      influence: 0,
      thinning: 0,
    },
    smoothing: {
      enabled: true,
      type: 'average',
      strength: 0.3,
    },
    stabilizer: {
      enabled: false,
      strength: 0,
      catchUp: false,
    },
    texture: {
      enabled: false,
      type: 'none',
      intensity: 0,
      scale: 1,
    },
    stroke: {
      lineCap: 'round',
      lineJoin: 'round',
      taper: { start: 0, end: 0 },
    },
  },
};

// ============ DEFAULT BRUSH ============

export const DEFAULT_BRUSH_CONFIG: BrushConfig = {
  id: 'default-pencil',
  name: 'Default Pencil',
  type: 'pencil',
  size: {
    base: 4,
    min: 0.2,
    max: 1.0,
  },
  pressure: {
    enabled: true,
    curve: 'soft',
    sensitivity: 1.0,
    minOutput: 0.1,
  },
  velocity: {
    enabled: true,
    influence: 0.3,
    thinning: 0.4,
  },
  smoothing: {
    enabled: true,
    type: 'catmullRom',
    strength: 0.5,
  },
  stabilizer: {
    enabled: true,
    strength: 0.3,
    catchUp: true,
  },
  texture: {
    enabled: true,
    type: 'pencil',
    intensity: 0.3,
    scale: 1,
  },
  opacity: {
    base: 1,
    pressureAffects: false,
    flowMode: false,
  },
  stroke: {
    lineCap: 'round',
    lineJoin: 'round',
    taper: {
      start: 0.3,
      end: 0.5,
    },
  },
};
