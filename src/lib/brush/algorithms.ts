/**
 * Brush Algorithms
 *
 * Algoritmos matemáticos para el brush engine:
 * - Suavizado de puntos (Catmull-Rom, Bézier)
 * - Cálculo de velocidad y ángulo
 * - Curvas de presión
 * - Interpolación de grosor
 */

import {
  InputPoint,
  ProcessedPoint,
  SmoothedPoint,
  BrushConfig,
  PressureCurve,
} from './types';

// ============ VELOCITY & ANGLE ============

/**
 * Calcula la velocidad entre dos puntos (pixels/ms)
 */
export function calculateVelocity(
  current: InputPoint,
  previous: InputPoint
): number {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const dt = current.timestamp - previous.timestamp;

  if (dt <= 0) return 0;
  return distance / dt;
}

/**
 * Calcula el ángulo de dirección entre dos puntos (radianes)
 */
export function calculateAngle(
  current: InputPoint,
  previous: InputPoint
): number {
  return Math.atan2(current.y - previous.y, current.x - previous.x);
}

/**
 * Calcula la distancia entre dos puntos
 */
export function calculateDistance(
  current: InputPoint,
  previous: InputPoint
): number {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ============ PRESSURE CURVES ============

/**
 * Aplica una curva de presión al valor de entrada
 */
export function applyPressureCurve(
  pressure: number,
  curve: PressureCurve,
  sensitivity: number = 1.0
): number {
  // Clamp input
  pressure = Math.max(0, Math.min(1, pressure));

  let output: number;

  switch (curve) {
    case 'linear':
      output = pressure;
      break;

    case 'soft':
      // Más sensible a presión ligera (raíz cuadrada)
      output = Math.sqrt(pressure);
      break;

    case 'hard':
      // Requiere más presión (cuadrática)
      output = pressure * pressure;
      break;

    case 'sCurve':
      // Curva S suave (smoothstep)
      output = pressure * pressure * (3 - 2 * pressure);
      break;

    default:
      output = pressure;
  }

  // Aplicar sensibilidad
  if (sensitivity !== 1.0) {
    output = Math.pow(output, 1 / sensitivity);
  }

  return Math.max(0, Math.min(1, output));
}

// ============ WIDTH CALCULATION ============

/**
 * Calcula el ancho del trazo basado en presión y velocidad
 */
export function calculateStrokeWidth(
  pressure: number,
  velocity: number,
  config: BrushConfig
): number {
  const { size, pressure: pressureConfig, velocity: velocityConfig } = config;

  // Aplicar curva de presión
  let pressureFactor = 1.0;
  if (pressureConfig.enabled) {
    const curvedPressure = applyPressureCurve(
      pressure,
      pressureConfig.curve,
      pressureConfig.sensitivity
    );
    // Mapear a rango [minOutput, 1]
    pressureFactor = pressureConfig.minOutput +
      (1 - pressureConfig.minOutput) * curvedPressure;
  }

  // Aplicar influencia de velocidad
  let velocityFactor = 1.0;
  if (velocityConfig.enabled && velocity > 0) {
    // Normalizar velocidad (0.5 px/ms es velocidad "normal")
    const normalizedVelocity = Math.min(velocity / 0.5, 2.0);
    // A mayor velocidad, trazo más fino
    const thinning = 1 - velocityConfig.thinning * normalizedVelocity * velocityConfig.influence;
    velocityFactor = Math.max(0.1, thinning);
  }

  // Calcular ancho final
  const baseFactor = pressureFactor * velocityFactor;
  const width = size.base * (size.min + (size.max - size.min) * baseFactor);

  return Math.max(0.5, width);
}

// ============ SMOOTHING ALGORITHMS ============

/**
 * Suavizado por promedio móvil
 */
export function smoothByAverage(
  points: InputPoint[],
  windowSize: number = 3
): InputPoint[] {
  if (points.length < windowSize) return [...points];

  const smoothed: InputPoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    let sumX = 0, sumY = 0, sumPressure = 0, count = 0;

    for (let j = Math.max(0, i - halfWindow); j <= Math.min(points.length - 1, i + halfWindow); j++) {
      sumX += points[j].x;
      sumY += points[j].y;
      sumPressure += points[j].pressure;
      count++;
    }

    smoothed.push({
      x: sumX / count,
      y: sumY / count,
      pressure: sumPressure / count,
      timestamp: points[i].timestamp,
    });
  }

  return smoothed;
}

/**
 * Interpolación Catmull-Rom entre puntos
 * Genera puntos suaves sin pasar por puntos de control artificiales
 */
export function catmullRomSpline(
  points: InputPoint[],
  tension: number = 0.5,
  segmentsPerPoint: number = 4
): SmoothedPoint[] {
  if (points.length < 2) {
    return points.map(p => ({
      x: p.x,
      y: p.y,
      pressure: p.pressure,
      width: 1,
    }));
  }

  const result: SmoothedPoint[] = [];

  // Duplicar primer y último punto para cerrar la curva
  const extendedPoints = [
    points[0],
    ...points,
    points[points.length - 1],
  ];

  for (let i = 1; i < extendedPoints.length - 2; i++) {
    const p0 = extendedPoints[i - 1];
    const p1 = extendedPoints[i];
    const p2 = extendedPoints[i + 1];
    const p3 = extendedPoints[i + 2];

    for (let t = 0; t < segmentsPerPoint; t++) {
      const s = t / segmentsPerPoint;
      const s2 = s * s;
      const s3 = s2 * s;

      // Coeficientes Catmull-Rom
      const c0 = -tension * s3 + 2 * tension * s2 - tension * s;
      const c1 = (2 - tension) * s3 + (tension - 3) * s2 + 1;
      const c2 = (tension - 2) * s3 + (3 - 2 * tension) * s2 + tension * s;
      const c3 = tension * s3 - tension * s2;

      result.push({
        x: c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x,
        y: c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y,
        pressure: c0 * p0.pressure + c1 * p1.pressure + c2 * p2.pressure + c3 * p3.pressure,
        width: 1, // Se calculará después
      });
    }
  }

  // Agregar último punto
  const last = points[points.length - 1];
  result.push({
    x: last.x,
    y: last.y,
    pressure: last.pressure,
    width: 1,
  });

  return result;
}

/**
 * Genera puntos de control Bézier cúbico entre puntos
 */
export function generateBezierControlPoints(
  points: InputPoint[],
  smoothness: number = 0.3
): SmoothedPoint[] {
  if (points.length < 2) {
    return points.map(p => ({
      x: p.x,
      y: p.y,
      pressure: p.pressure,
      width: 1,
    }));
  }

  const result: SmoothedPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const prev = points[i - 1] || current;
    const next = points[i + 1] || current;

    // Dirección tangente
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Puntos de control basados en tangente
    const controlDist = dist * smoothness;

    const cp1 = i > 0 ? {
      x: current.x - (dx / dist) * controlDist || current.x,
      y: current.y - (dy / dist) * controlDist || current.y,
    } : undefined;

    const cp2 = i < points.length - 1 ? {
      x: current.x + (dx / dist) * controlDist || current.x,
      y: current.y + (dy / dist) * controlDist || current.y,
    } : undefined;

    result.push({
      x: current.x,
      y: current.y,
      pressure: current.pressure,
      width: 1,
      cp1,
      cp2,
    });
  }

  return result;
}

// ============ TAPER (ADELGAZAMIENTO) ============

/**
 * Aplica adelgazamiento al inicio y final del trazo
 */
export function applyTaper(
  points: SmoothedPoint[],
  taperStart: number,
  taperEnd: number
): SmoothedPoint[] {
  if (points.length < 2) return points;

  const totalLength = calculateTotalLength(points);
  const taperStartLength = totalLength * taperStart;
  const taperEndLength = totalLength * taperEnd;

  let accumulatedLength = 0;
  const result: SmoothedPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = { ...points[i] };

    if (i > 0) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      accumulatedLength += Math.sqrt(dx * dx + dy * dy);
    }

    // Taper al inicio
    if (accumulatedLength < taperStartLength && taperStartLength > 0) {
      const factor = accumulatedLength / taperStartLength;
      point.width *= easeInQuad(factor);
    }

    // Taper al final
    const remainingLength = totalLength - accumulatedLength;
    if (remainingLength < taperEndLength && taperEndLength > 0) {
      const factor = remainingLength / taperEndLength;
      point.width *= easeOutQuad(factor);
    }

    result.push(point);
  }

  return result;
}

/**
 * Calcula la longitud total del trazo
 */
function calculateTotalLength(points: SmoothedPoint[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

// ============ EASING FUNCTIONS ============

function easeInQuad(t: number): number {
  return t * t;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// ============ STABILIZER ============

/**
 * Implementa "lazy brush" / stabilizer
 * El punto sigue al cursor con un delay suave
 */
export function applyStabilizer(
  inputPoint: InputPoint,
  lastStablePoint: InputPoint | null,
  strength: number
): InputPoint {
  if (!lastStablePoint || strength <= 0) {
    return inputPoint;
  }

  // Lerp hacia el punto de entrada
  const factor = 1 - Math.pow(strength, 0.1); // Curva de respuesta

  return {
    x: lastStablePoint.x + (inputPoint.x - lastStablePoint.x) * factor,
    y: lastStablePoint.y + (inputPoint.y - lastStablePoint.y) * factor,
    pressure: lastStablePoint.pressure + (inputPoint.pressure - lastStablePoint.pressure) * factor,
    timestamp: inputPoint.timestamp,
  };
}

/**
 * Catch-up: genera puntos para alcanzar el cursor al soltar
 */
export function generateCatchUpPoints(
  lastStablePoint: InputPoint,
  targetPoint: InputPoint,
  steps: number = 5
): InputPoint[] {
  const points: InputPoint[] = [];
  const dt = (targetPoint.timestamp - lastStablePoint.timestamp) / steps;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: lastStablePoint.x + (targetPoint.x - lastStablePoint.x) * t,
      y: lastStablePoint.y + (targetPoint.y - lastStablePoint.y) * t,
      pressure: lastStablePoint.pressure + (targetPoint.pressure - lastStablePoint.pressure) * t,
      timestamp: lastStablePoint.timestamp + dt * i,
    });
  }

  return points;
}

// ============ POINT PROCESSING PIPELINE ============

/**
 * Procesa un array de puntos crudos a puntos listos para rendering
 */
export function processStrokePoints(
  rawPoints: InputPoint[],
  config: BrushConfig
): SmoothedPoint[] {
  if (rawPoints.length === 0) return [];

  // 1. Calcular velocidad y ángulo para cada punto
  const processed: ProcessedPoint[] = rawPoints.map((point, i) => {
    const prev = rawPoints[i - 1] || point;
    const velocity = calculateVelocity(point, prev);
    const angle = calculateAngle(point, prev);
    const distance = calculateDistance(point, prev);
    const width = calculateStrokeWidth(point.pressure, velocity, config);

    return {
      ...point,
      velocity,
      angle,
      distance,
      width,
    };
  });

  // 2. Aplicar suavizado
  let smoothed: SmoothedPoint[];

  if (config.smoothing.enabled) {
    switch (config.smoothing.type) {
      case 'catmullRom':
        smoothed = catmullRomSpline(
          processed,
          config.smoothing.strength,
          Math.ceil(4 * config.smoothing.strength)
        );
        break;

      case 'bezier':
        smoothed = generateBezierControlPoints(processed, config.smoothing.strength);
        break;

      case 'average':
        const avgPoints = smoothByAverage(processed, 3 + Math.floor(config.smoothing.strength * 4));
        smoothed = avgPoints.map(p => ({ ...p, width: 1 }));
        break;

      default:
        smoothed = processed.map(p => ({
          x: p.x,
          y: p.y,
          pressure: p.pressure,
          width: p.width,
        }));
    }
  } else {
    smoothed = processed.map(p => ({
      x: p.x,
      y: p.y,
      pressure: p.pressure,
      width: p.width,
    }));
  }

  // 3. Recalcular widths para puntos suavizados (interpolación)
  if (smoothed.length > processed.length) {
    // Interpolar widths desde puntos originales
    const ratio = (processed.length - 1) / (smoothed.length - 1);
    for (let i = 0; i < smoothed.length; i++) {
      const srcIndex = i * ratio;
      const lower = Math.floor(srcIndex);
      const upper = Math.min(lower + 1, processed.length - 1);
      const t = srcIndex - lower;
      smoothed[i].width = processed[lower].width * (1 - t) + processed[upper].width * t;
    }
  }

  // 4. Aplicar taper
  if (config.stroke.taper.start > 0 || config.stroke.taper.end > 0) {
    smoothed = applyTaper(
      smoothed,
      config.stroke.taper.start,
      config.stroke.taper.end
    );
  }

  return smoothed;
}
