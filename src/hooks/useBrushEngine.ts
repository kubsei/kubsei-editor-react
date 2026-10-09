/**
 * useBrushEngine - Hook principal del motor de pinceles
 *
 * Integra todos los componentes del sistema de pinceles:
 * - Captura de input con presión
 * - Estabilización (lazy brush)
 * - Procesamiento de puntos (velocidad, suavizado)
 * - Cálculo de ancho variable
 *
 * Uso:
 * ```tsx
 * const brush = useBrushEngine({ preset: 'mangaPencil' });
 *
 * // En pointer events
 * brush.startStroke(e);  // pointerdown
 * brush.addPoint(e);     // pointermove
 * brush.endStroke(e);    // pointerup
 *
 * // Para rendering
 * const points = brush.getProcessedPoints();
 * ```
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useStabilizer } from './useStabilizer';
import {
  BrushConfig,
  InputPoint,
  ProcessedPoint,
  SmoothedPoint,
  BRUSH_PRESETS,
  BrushPreset,
  DEFAULT_BRUSH_CONFIG,
} from '@/lib/brush/types';
import {
  calculateVelocity,
  calculateAngle,
  calculateDistance,
  calculateStrokeWidth,
  processStrokePoints,
  applyStabilizer,
} from '@/lib/brush/algorithms';
import { createTexturePattern } from '@/lib/brush/textures';

// ============ TYPES ============

interface UseBrushEngineOptions {
  preset?: BrushPreset;
  config?: Partial<BrushConfig>;
  onStrokeStart?: (strokeId: string) => void;
  onStrokeUpdate?: (points: SmoothedPoint[]) => void;
  onStrokeEnd?: (points: SmoothedPoint[], rawPoints: InputPoint[]) => void;
}

interface BrushEngineState {
  isDrawing: boolean;
  pointCount: number;
  currentWidth: number;
  currentPressure: number;
}

interface UseBrushEngineReturn {
  // Estado
  state: BrushEngineState;
  config: BrushConfig;

  // Control de stroke
  startStroke: (e: PointerEvent, strokeId?: string) => void;
  addPoint: (e: PointerEvent) => void;
  endStroke: (e: PointerEvent) => void;
  cancelStroke: () => void;

  // Datos para rendering
  getProcessedPoints: () => SmoothedPoint[];
  getRawPoints: () => InputPoint[];
  getFlatPoints: () => number[];
  getTexturePattern: () => CanvasPattern | null;

  // Configuración
  updateConfig: (updates: Partial<BrushConfig>) => void;
  setPreset: (preset: BrushPreset) => void;

  // Reset
  reset: () => void;
}

// ============ CONSTANTS ============

const DEFAULT_PRESSURE = 0.5;
const MIN_POINT_DISTANCE = 1; // pixels

// ============ HOOK ============

export function useBrushEngine(
  options: UseBrushEngineOptions = {}
): UseBrushEngineReturn {
  const {
    preset = 'mangaPencil',
    config: initialConfig,
    onStrokeStart,
    onStrokeUpdate,
    onStrokeEnd,
  } = options;

  // Configuración del brush
  const [config, setConfig] = useState<BrushConfig>(() => ({
    ...DEFAULT_BRUSH_CONFIG,
    ...BRUSH_PRESETS[preset],
    ...initialConfig,
  }));

  // Estado del stroke actual
  const [state, setState] = useState<BrushEngineState>({
    isDrawing: false,
    pointCount: 0,
    currentWidth: config.size.base,
    currentPressure: DEFAULT_PRESSURE,
  });

  // Refs para evitar re-renders
  const rawPointsRef = useRef<InputPoint[]>([]);
  const processedPointsRef = useRef<SmoothedPoint[]>([]);
  const strokeIdRef = useRef<string>('');
  const lastPointRef = useRef<InputPoint | null>(null);
  const texturePatternRef = useRef<CanvasPattern | null>(null);

  // Stabilizer
  const stabilizer = useStabilizer({
    enabled: config.stabilizer.enabled,
    strength: config.stabilizer.strength,
    catchUp: config.stabilizer.catchUp,
  });

  // Patrón de textura (memoizado)
  const texturePattern = useMemo(() => {
    if (!config.texture.enabled) return null;
    return createTexturePattern(
      config.texture.type,
      config.texture.scale,
      config.texture.intensity
    );
  }, [config.texture]);

  // Actualizar ref de textura (en un efecto: las refs no se escriben durante el render)
  useEffect(() => {
    texturePatternRef.current = texturePattern;
  }, [texturePattern]);

  // ============ HELPERS ============

  /**
   * Extrae punto desde PointerEvent
   */
  const extractPoint = useCallback((e: PointerEvent): InputPoint => {
    let pressure = e.pressure;

    // Mouse sin presión real
    if (pressure === 0 && e.buttons > 0) {
      pressure = DEFAULT_PRESSURE;
    }

    return {
      x: e.offsetX,
      y: e.offsetY,
      pressure: Math.max(0, Math.min(1, pressure)),
      timestamp: e.timeStamp,
    };
  }, []);

  /**
   * Verifica si el punto está lo suficientemente lejos del anterior
   */
  const isPointFarEnough = useCallback((point: InputPoint): boolean => {
    if (!lastPointRef.current) return true;

    const dx = point.x - lastPointRef.current.x;
    const dy = point.y - lastPointRef.current.y;
    return dx * dx + dy * dy >= MIN_POINT_DISTANCE * MIN_POINT_DISTANCE;
  }, []);

  /**
   * Procesa los puntos acumulados
   */
  const processPoints = useCallback(() => {
    const rawPoints = rawPointsRef.current;
    if (rawPoints.length === 0) return;

    // Procesar con algoritmos de smoothing
    const processed = processStrokePoints(rawPoints, config);
    processedPointsRef.current = processed;

    // Callback de actualización
    onStrokeUpdate?.(processed);
  }, [config, onStrokeUpdate]);

  // ============ STROKE CONTROL ============

  /**
   * Inicia un nuevo stroke
   */
  const startStroke = useCallback((e: PointerEvent, strokeId?: string) => {
    // Solo botón principal
    if (e.button !== 0) return;

    // Reset estado
    rawPointsRef.current = [];
    processedPointsRef.current = [];
    lastPointRef.current = null;
    stabilizer.reset();

    // Generar ID
    strokeIdRef.current = strokeId || `stroke_${Date.now()}`;

    // Capturar primer punto
    let point = extractPoint(e);

    // Aplicar stabilizer si está habilitado
    if (config.stabilizer.enabled) {
      point = stabilizer.processPoint(point);
    }

    rawPointsRef.current.push(point);
    lastPointRef.current = point;

    // Calcular ancho inicial
    const width = calculateStrokeWidth(point.pressure, 0, config);

    setState({
      isDrawing: true,
      pointCount: 1,
      currentWidth: width,
      currentPressure: point.pressure,
    });

    // Procesar punto inicial
    processPoints();

    onStrokeStart?.(strokeIdRef.current);
  }, [extractPoint, config, stabilizer, processPoints, onStrokeStart]);

  /**
   * Añade un punto al stroke actual
   */
  const addPoint = useCallback((e: PointerEvent) => {
    if (!state.isDrawing) return;

    let point = extractPoint(e);

    // Aplicar stabilizer
    if (config.stabilizer.enabled) {
      point = stabilizer.processPoint(point);
    }

    // Verificar distancia mínima
    if (!isPointFarEnough(point)) return;

    // Calcular métricas
    const velocity = lastPointRef.current
      ? calculateVelocity(point, lastPointRef.current)
      : 0;
    const width = calculateStrokeWidth(point.pressure, velocity, config);

    // Agregar punto
    rawPointsRef.current.push(point);
    lastPointRef.current = point;

    setState(prev => ({
      ...prev,
      pointCount: rawPointsRef.current.length,
      currentWidth: width,
      currentPressure: point.pressure,
    }));

    // Reprocesar todos los puntos
    processPoints();
  }, [state.isDrawing, extractPoint, config, stabilizer, isPointFarEnough, processPoints]);

  /**
   * Finaliza el stroke
   */
  const endStroke = useCallback((e: PointerEvent) => {
    if (!state.isDrawing) return;

    // Agregar punto final
    const point = extractPoint(e);

    // Catch-up del stabilizer
    if (config.stabilizer.enabled && config.stabilizer.catchUp) {
      const catchUpPoints = stabilizer.getCatchUpPoints(point);
      rawPointsRef.current.push(...catchUpPoints);
    }

    // Agregar punto final si es diferente
    if (isPointFarEnough(point)) {
      rawPointsRef.current.push(point);
    }

    // Procesar puntos finales
    processPoints();

    // Callback
    onStrokeEnd?.(processedPointsRef.current, rawPointsRef.current);

    // Reset estado
    setState(prev => ({
      ...prev,
      isDrawing: false,
    }));
  }, [state.isDrawing, extractPoint, config.stabilizer, stabilizer, isPointFarEnough, processPoints, onStrokeEnd]);

  /**
   * Cancela el stroke sin guardar
   */
  const cancelStroke = useCallback(() => {
    rawPointsRef.current = [];
    processedPointsRef.current = [];
    lastPointRef.current = null;
    strokeIdRef.current = '';
    stabilizer.reset();

    setState({
      isDrawing: false,
      pointCount: 0,
      currentWidth: config.size.base,
      currentPressure: DEFAULT_PRESSURE,
    });
  }, [config.size.base, stabilizer]);

  // ============ DATA ACCESSORS ============

  /**
   * Obtiene los puntos procesados para rendering
   */
  const getProcessedPoints = useCallback((): SmoothedPoint[] => {
    return [...processedPointsRef.current];
  }, []);

  /**
   * Obtiene los puntos crudos
   */
  const getRawPoints = useCallback((): InputPoint[] => {
    return [...rawPointsRef.current];
  }, []);

  /**
   * Obtiene puntos en formato plano [x1, y1, x2, y2, ...]
   */
  const getFlatPoints = useCallback((): number[] => {
    const points = processedPointsRef.current;
    const flat = new Array(points.length * 2);

    for (let i = 0; i < points.length; i++) {
      flat[i * 2] = points[i].x;
      flat[i * 2 + 1] = points[i].y;
    }

    return flat;
  }, []);

  /**
   * Obtiene el patrón de textura actual
   */
  const getTexturePattern = useCallback((): CanvasPattern | null => {
    return texturePatternRef.current;
  }, []);

  // ============ CONFIGURATION ============

  /**
   * Actualiza la configuración del brush
   */
  const updateConfig = useCallback((updates: Partial<BrushConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
    }));

    // Actualizar stabilizer si cambió
    if (updates.stabilizer) {
      stabilizer.updateConfig({
        enabled: updates.stabilizer.enabled ?? config.stabilizer.enabled,
        strength: updates.stabilizer.strength ?? config.stabilizer.strength,
        catchUp: updates.stabilizer.catchUp ?? config.stabilizer.catchUp,
      });
    }
  }, [config.stabilizer, stabilizer]);

  /**
   * Aplica un preset completo
   */
  const setPreset = useCallback((newPreset: BrushPreset) => {
    const presetConfig = BRUSH_PRESETS[newPreset];
    const fullConfig: BrushConfig = {
      ...DEFAULT_BRUSH_CONFIG,
      ...presetConfig,
    };
    setConfig(fullConfig);

    stabilizer.updateConfig({
      enabled: fullConfig.stabilizer.enabled,
      strength: fullConfig.stabilizer.strength,
      catchUp: fullConfig.stabilizer.catchUp,
    });
  }, [stabilizer]);

  /**
   * Reset completo
   */
  const reset = useCallback(() => {
    cancelStroke();
  }, [cancelStroke]);

  // ============ RETURN ============

  return {
    state,
    config,
    startStroke,
    addPoint,
    endStroke,
    cancelStroke,
    getProcessedPoints,
    getRawPoints,
    getFlatPoints,
    getTexturePattern,
    updateConfig,
    setPreset,
    reset,
  };
}

// ============ EXPORTS ============

export default useBrushEngine;
export type { UseBrushEngineOptions, BrushEngineState, UseBrushEngineReturn };
