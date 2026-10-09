/**
 * useStrokeCapture - Hook para captura de strokes en tiempo real
 *
 * Responsabilidades:
 * - Capturar eventos de pointer (mouse, touch, stylus)
 * - Acumular puntos crudos durante el drawing
 * - Detectar presión del stylus (PointerEvent.pressure)
 * - Al finalizar, enviar al Worker para encoding
 *
 * NO hace:
 * - Simplificación de puntos
 * - Smoothing destructivo
 * - Rendering (eso es responsabilidad del canvas)
 */

import { useCallback, useRef, useState } from 'react';
import { RawStrokePoint, RawStroke, OptimizedStroke } from '@/types/stroke';
import { v4 as uuidv4 } from 'uuid';

// ============ TYPES ============

interface StrokeCaptureState {
  isDrawing: boolean;
  currentPoints: RawStrokePoint[];
  pointCount: number;
}

interface StrokeCaptureConfig {
  layerId: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  tension: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  globalCompositeOperation: GlobalCompositeOperation;
}

interface UseStrokeCaptureOptions {
  onStrokeStart?: (strokeId: string) => void;
  onStrokeProgress?: (points: RawStrokePoint[], flatPoints: number[]) => void;
  onStrokeEnd?: (rawStroke: RawStroke) => Promise<void>;
  minPointDistance?: number; // Distancia mínima entre puntos (evita duplicados)
}

interface UseStrokeCaptureReturn {
  // Estado
  state: StrokeCaptureState;

  // Handlers para eventos de pointer
  handlePointerDown: (e: PointerEvent, config: StrokeCaptureConfig) => void;
  handlePointerMove: (e: PointerEvent) => void;
  handlePointerUp: (e: PointerEvent) => void;
  handlePointerCancel: () => void;

  // Control manual
  cancelStroke: () => void;

  // Datos para rendering en tiempo real
  getCurrentFlatPoints: () => number[];
  getCurrentPressures: () => number[];
}

// ============ CONSTANTS ============

const DEFAULT_PRESSURE = 0.5;

// ============ HOOK ============

export function useStrokeCapture(
  options: UseStrokeCaptureOptions = {}
): UseStrokeCaptureReturn {
  const {
    onStrokeStart,
    onStrokeProgress,
    onStrokeEnd,
    minPointDistance = 1,
  } = options;

  // Estado del stroke actual
  const [state, setState] = useState<StrokeCaptureState>({
    isDrawing: false,
    currentPoints: [],
    pointCount: 0,
  });

  // Refs para evitar re-renders innecesarios
  const pointsRef = useRef<RawStrokePoint[]>([]);
  const strokeIdRef = useRef<string>('');
  const configRef = useRef<StrokeCaptureConfig | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const minDistanceSquared = minPointDistance * minPointDistance;

  // ============ HELPERS ============

  /**
   * Extrae la posición y presión de un PointerEvent
   * Soporta mouse, touch y stylus con presión real
   */
  const extractPointFromEvent = useCallback((e: PointerEvent): RawStrokePoint => {
    // La presión viene del stylus (1 = presión máxima, 0.5 = default para mouse)
    let pressure = e.pressure;

    // Mouse sin botón presionado reporta pressure = 0
    // Mouse con botón presionado reporta pressure = 0.5
    // Stylus reporta presión real 0-1
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
   * Verifica si un punto está lo suficientemente lejos del anterior
   */
  const isPointFarEnough = useCallback((x: number, y: number): boolean => {
    if (!lastPointRef.current) return true;

    const dx = x - lastPointRef.current.x;
    const dy = y - lastPointRef.current.y;
    return (dx * dx + dy * dy) >= minDistanceSquared;
  }, [minDistanceSquared]);

  /**
   * Convierte puntos a formato plano para Konva
   */
  const pointsToFlatArray = useCallback((points: RawStrokePoint[]): number[] => {
    const flat = new Array(points.length * 2);
    for (let i = 0; i < points.length; i++) {
      flat[i * 2] = points[i].x;
      flat[i * 2 + 1] = points[i].y;
    }
    return flat;
  }, []);

  // ============ EVENT HANDLERS ============

  const handlePointerDown = useCallback((e: PointerEvent, config: StrokeCaptureConfig) => {
    // Solo responder al botón principal
    if (e.button !== 0) return;

    // Inicializar nuevo stroke
    const strokeId = uuidv4();
    strokeIdRef.current = strokeId;
    configRef.current = config;
    pointsRef.current = [];
    lastPointRef.current = null;

    // Capturar primer punto
    const point = extractPointFromEvent(e);
    pointsRef.current.push(point);
    lastPointRef.current = { x: point.x, y: point.y };

    // Actualizar estado
    setState({
      isDrawing: true,
      currentPoints: [...pointsRef.current],
      pointCount: 1,
    });

    // Callback
    onStrokeStart?.(strokeId);
  }, [extractPointFromEvent, onStrokeStart]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    // Solo si estamos dibujando
    if (!strokeIdRef.current || pointsRef.current.length === 0) return;

    const point = extractPointFromEvent(e);

    // Verificar distancia mínima
    if (!isPointFarEnough(point.x, point.y)) return;

    // Agregar punto
    pointsRef.current.push(point);
    lastPointRef.current = { x: point.x, y: point.y };

    // Actualizar estado (para re-render del canvas)
    const currentPoints = [...pointsRef.current];
    setState({
      isDrawing: true,
      currentPoints,
      pointCount: currentPoints.length,
    });

    // Callback con puntos para rendering inmediato
    const flatPoints = pointsToFlatArray(currentPoints);
    onStrokeProgress?.(currentPoints, flatPoints);
  }, [extractPointFromEvent, isPointFarEnough, onStrokeProgress, pointsToFlatArray]);

  const handlePointerUp = useCallback(async (e: PointerEvent) => {
    // Verificar que hay un stroke activo
    if (!strokeIdRef.current || !configRef.current || pointsRef.current.length === 0) {
      return;
    }

    // Agregar punto final si es diferente
    const point = extractPointFromEvent(e);
    if (isPointFarEnough(point.x, point.y)) {
      pointsRef.current.push(point);
    }

    // Crear RawStroke
    const config = configRef.current;
    const rawStroke: RawStroke = {
      id: strokeIdRef.current,
      points: [...pointsRef.current],
      metadata: {
        id: strokeIdRef.current,
        layerId: config.layerId,
        stroke: config.stroke,
        strokeWidth: config.strokeWidth,
        opacity: config.opacity,
        tension: config.tension,
        lineCap: config.lineCap,
        lineJoin: config.lineJoin,
        globalCompositeOperation: config.globalCompositeOperation,
        pointCount: pointsRef.current.length,
        bufferVersion: 1,
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, // Se calculará en el Worker
        createdAt: Date.now(),
        hasPressure: false, // Se determinará en el Worker
      },
    };

    // Limpiar estado
    strokeIdRef.current = '';
    configRef.current = null;
    pointsRef.current = [];
    lastPointRef.current = null;

    setState({
      isDrawing: false,
      currentPoints: [],
      pointCount: 0,
    });

    // Enviar al callback (que enviará al Worker)
    await onStrokeEnd?.(rawStroke);
  }, [extractPointFromEvent, isPointFarEnough, onStrokeEnd]);

  const handlePointerCancel = useCallback(() => {
    // Cancelar stroke sin guardar
    strokeIdRef.current = '';
    configRef.current = null;
    pointsRef.current = [];
    lastPointRef.current = null;

    setState({
      isDrawing: false,
      currentPoints: [],
      pointCount: 0,
    });
  }, []);

  // ============ CONTROL METHODS ============

  const cancelStroke = useCallback(() => {
    handlePointerCancel();
  }, [handlePointerCancel]);

  const getCurrentFlatPoints = useCallback((): number[] => {
    return pointsToFlatArray(pointsRef.current);
  }, [pointsToFlatArray]);

  const getCurrentPressures = useCallback((): number[] => {
    return pointsRef.current.map(p => p.pressure);
  }, []);

  // ============ RETURN ============

  return {
    state,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    cancelStroke,
    getCurrentFlatPoints,
    getCurrentPressures,
  };
}

// ============ WORKER INTEGRATION HOOK ============

interface WorkerRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Hook para integrar useStrokeCapture con el Web Worker
 * Maneja la comunicación Worker ↔ Main thread
 */
export function useStrokeWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, WorkerRequest>>(new Map());
  const requestIdCounter = useRef(0);

  // Inicializar Worker
  const initWorker = useCallback(() => {
    if (workerRef.current) return;

    try {
      // Next.js Worker syntax
      workerRef.current = new Worker(
        new URL('../workers/stroke.worker.ts', import.meta.url)
      );

      workerRef.current.onmessage = (event) => {
        const { type, payload, requestId, error } = event.data;

        const request = pendingRequests.current.get(requestId);
        if (!request) return;

        pendingRequests.current.delete(requestId);

        if (type === 'error') {
          request.reject(new Error(error));
        } else if (type === 'encoded' || type === 'batch-encoded') {
          request.resolve(payload);
        }
      };

      workerRef.current.onerror = (error) => {
        console.error('[StrokeWorker] Error:', error);
      };
    } catch (error) {
      console.error('[StrokeWorker] Failed to initialize:', error);
    }
  }, []);

  // Terminar Worker
  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      pendingRequests.current.clear();
    }
  }, []);

  // Enviar stroke para encoding
  const encodeStroke = useCallback((rawStroke: RawStroke): Promise<OptimizedStroke> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        initWorker();
      }

      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const requestId = `req_${++requestIdCounter.current}`;
      pendingRequests.current.set(requestId, {
        resolve: (value: unknown) => resolve(value as OptimizedStroke),
        reject,
      });

      workerRef.current.postMessage({
        type: 'encode',
        payload: rawStroke,
        requestId,
      });
    });
  }, [initWorker]);

  // Batch encode
  const encodeStrokes = useCallback((rawStrokes: RawStroke[]): Promise<OptimizedStroke[]> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        initWorker();
      }

      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const requestId = `req_${++requestIdCounter.current}`;
      pendingRequests.current.set(requestId, {
        resolve: (value: unknown) => resolve(value as OptimizedStroke[]),
        reject,
      });

      workerRef.current.postMessage({
        type: 'batch-encode',
        payload: rawStrokes,
        requestId,
      });
    });
  }, [initWorker]);

  return {
    initWorker,
    terminateWorker,
    encodeStroke,
    encodeStrokes,
  };
}

export default useStrokeCapture;
