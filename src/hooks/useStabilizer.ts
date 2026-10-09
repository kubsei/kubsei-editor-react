/**
 * useStabilizer - Hook para estabilización de input (Lazy Brush)
 *
 * Implementa el efecto "lazy brush" usado en aplicaciones profesionales de dibujo:
 * - El punto sigue al cursor con un delay suave
 * - Elimina jitter y temblor de mano
 * - Produce líneas más suaves y controladas
 *
 * Basado en técnicas de Clip Studio Paint y Procreate
 */

import { useCallback, useRef } from 'react';
import { InputPoint } from '@/lib/brush/types';

// ============ TYPES ============

interface StabilizerConfig {
  enabled: boolean;
  strength: number; // 0-1, cuánto suaviza (0 = sin suavizado, 1 = máximo delay)
  catchUp: boolean; // Si al soltar el cursor debe alcanzar el punto final
  catchUpSteps: number; // Número de pasos para catch-up
}

interface StabilizerState {
  lastStablePoint: InputPoint | null;
  isActive: boolean;
}

interface UseStabilizerReturn {
  // Procesar un punto de entrada
  processPoint: (input: InputPoint) => InputPoint;

  // Generar puntos de catch-up al finalizar
  getCatchUpPoints: (finalPoint: InputPoint) => InputPoint[];

  // Reset del stabilizer
  reset: () => void;

  // Estado actual
  getState: () => StabilizerState;

  // Actualizar configuración
  updateConfig: (config: Partial<StabilizerConfig>) => void;
}

// ============ DEFAULTS ============

const DEFAULT_CONFIG: StabilizerConfig = {
  enabled: true,
  strength: 0.5,
  catchUp: true,
  catchUpSteps: 5,
};

// ============ HOOK ============

export function useStabilizer(
  initialConfig: Partial<StabilizerConfig> = {}
): UseStabilizerReturn {
  // Configuración
  const configRef = useRef<StabilizerConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  // Estado del stabilizer
  const stateRef = useRef<StabilizerState>({
    lastStablePoint: null,
    isActive: false,
  });

  /**
   * Calcula el factor de interpolación basado en strength
   * Curva exponencial para respuesta más natural
   */
  const calculateLerpFactor = useCallback((strength: number): number => {
    // strength 0 = factor 1 (sin delay)
    // strength 1 = factor ~0.05 (delay máximo)
    // Curva: factor = (1 - strength)^3
    const normalized = Math.max(0, Math.min(1, strength));
    return Math.pow(1 - normalized, 3) * 0.9 + 0.1; // Mínimo 0.1 para evitar que se quede
  }, []);

  /**
   * Interpola linealmente entre dos valores
   */
  const lerp = useCallback((a: number, b: number, t: number): number => {
    return a + (b - a) * t;
  }, []);

  /**
   * Procesa un punto de entrada aplicando estabilización
   */
  const processPoint = useCallback((input: InputPoint): InputPoint => {
    const config = configRef.current;
    const state = stateRef.current;

    // Si está deshabilitado, devolver punto sin procesar
    if (!config.enabled || config.strength <= 0) {
      stateRef.current.lastStablePoint = input;
      stateRef.current.isActive = true;
      return input;
    }

    // Primer punto: no hay suavizado posible
    if (!state.lastStablePoint) {
      stateRef.current.lastStablePoint = input;
      stateRef.current.isActive = true;
      return input;
    }

    // Calcular factor de interpolación
    const factor = calculateLerpFactor(config.strength);

    // Interpolar posición
    const stablePoint: InputPoint = {
      x: lerp(state.lastStablePoint.x, input.x, factor),
      y: lerp(state.lastStablePoint.y, input.y, factor),
      pressure: lerp(state.lastStablePoint.pressure, input.pressure, factor),
      timestamp: input.timestamp,
    };

    // Actualizar último punto estable
    stateRef.current.lastStablePoint = stablePoint;

    return stablePoint;
  }, [calculateLerpFactor, lerp]);

  /**
   * Genera puntos de catch-up para alcanzar el punto final
   * Se llama al soltar el pointer para que el trazo termine donde el usuario lo dejó
   */
  const getCatchUpPoints = useCallback((finalPoint: InputPoint): InputPoint[] => {
    const config = configRef.current;
    const state = stateRef.current;

    // Si catch-up deshabilitado o no hay punto previo
    if (!config.catchUp || !state.lastStablePoint) {
      return [];
    }

    // Calcular distancia al punto final
    const dx = finalPoint.x - state.lastStablePoint.x;
    const dy = finalPoint.y - state.lastStablePoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Si ya estamos cerca, no generar puntos extra
    if (distance < 1) {
      return [];
    }

    // Generar puntos intermedios
    const points: InputPoint[] = [];
    const steps = config.catchUpSteps;
    const dt = finalPoint.timestamp
      ? (finalPoint.timestamp - (state.lastStablePoint.timestamp || 0)) / steps
      : 16; // ~60fps si no hay timestamp

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Usar easing para suavizar la llegada
      const easedT = easeOutQuad(t);

      points.push({
        x: lerp(state.lastStablePoint.x, finalPoint.x, easedT),
        y: lerp(state.lastStablePoint.y, finalPoint.y, easedT),
        pressure: lerp(state.lastStablePoint.pressure, finalPoint.pressure, easedT),
        timestamp: (state.lastStablePoint.timestamp || 0) + dt * i,
      });
    }

    return points;
  }, [lerp]);

  /**
   * Resetea el estado del stabilizer
   * Llamar al iniciar un nuevo stroke
   */
  const reset = useCallback(() => {
    stateRef.current = {
      lastStablePoint: null,
      isActive: false,
    };
  }, []);

  /**
   * Obtiene el estado actual (para debugging)
   */
  const getState = useCallback((): StabilizerState => {
    return { ...stateRef.current };
  }, []);

  /**
   * Actualiza la configuración en tiempo real
   */
  const updateConfig = useCallback((newConfig: Partial<StabilizerConfig>) => {
    configRef.current = {
      ...configRef.current,
      ...newConfig,
    };
  }, []);

  return {
    processPoint,
    getCatchUpPoints,
    reset,
    getState,
    updateConfig,
  };
}

// ============ EASING FUNCTIONS ============

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// ============ EXPORT ============

export default useStabilizer;
export type { StabilizerConfig, StabilizerState, UseStabilizerReturn };
