/**
 * NaturalStroke - Componente de trazo natural para rendering
 *
 * Soporta dos modos de rendering:
 * 1. Legacy: Konva Line simple (trazos antiguos sin datos de presión)
 * 2. Natural: VariableWidthStroke con ancho variable
 *
 * Detecta automáticamente el modo basándose en los datos del elemento.
 */

import { memo, useMemo } from 'react';
import { Line } from 'react-konva';
import { VariableWidthStroke } from './VariableWidthStroke';
import { DrawingElement } from '@/types/editor';
import { SmoothedPoint, BrushConfig, BRUSH_PRESETS, DEFAULT_BRUSH_CONFIG, BrushPreset } from '@/lib/brush/types';
import { processStrokePoints } from '@/lib/brush/algorithms';
import { createTexturePattern } from '@/lib/brush/textures';
import { base64ToArrayBuffer, decodeStroke } from '@/lib/stroke/codec';

// ============ TYPES ============

interface NaturalStrokeProps {
  element: DrawingElement;
  zoom?: number;
  // Si tiene datos de presión usará rendering natural
  naturalMode?: boolean;
}

// Extended drawing element with pressure data
interface NaturalDrawingElement extends DrawingElement {
  // Datos de presión por punto (opcional, para trazos naturales)
  pressureData?: number[];
  // Configuración de brush usada
  brushConfig?: Partial<BrushConfig>;
  // Preset usado
  brushPreset?: string;
}

// ============ COMPONENT ============

const NaturalStroke = memo(function NaturalStroke({
  element,
  zoom = 1,
  naturalMode = false,
}: NaturalStrokeProps) {
  const naturalElement = element as NaturalDrawingElement;

  // Determinar si usar rendering natural
  const useNaturalRendering = useMemo(() => {
    // Forzar modo natural si se especifica y hay datos de presión
    if (naturalMode && naturalElement.pressureData) {
      return true;
    }
    // Auto-detectar: si tiene datos de presión, usar natural
    return Boolean(naturalElement.pressureData && naturalElement.pressureData.length > 0);
  }, [naturalMode, naturalElement.pressureData]);

  // Obtener puntos del elemento
  const rawPoints = useMemo((): number[] => {
    if (naturalElement.bufferBase64) {
      try {
        const buffer = base64ToArrayBuffer(naturalElement.bufferBase64);
        const { flatPoints } = decodeStroke(buffer);
        return flatPoints;
      } catch (error) {
        console.error('[NaturalStroke] Error decoding buffer:', error);
        return naturalElement.points;
      }
    }
    return naturalElement.points;
  }, [naturalElement.bufferBase64, naturalElement.points]);

  // Procesar puntos para rendering natural
  const processedPoints = useMemo((): SmoothedPoint[] => {
    if (!useNaturalRendering) return [];

    // Convertir puntos planos a InputPoints con presión
    const inputPoints = [];
    const pressureData = naturalElement.pressureData || [];

    for (let i = 0; i < rawPoints.length; i += 2) {
      const pointIndex = i / 2;
      inputPoints.push({
        x: rawPoints[i],
        y: rawPoints[i + 1],
        pressure: pressureData[pointIndex] ?? 0.5,
        timestamp: pointIndex * 16, // Simulated ~60fps timestamps: only the deltas matter
      });
    }

    // Obtener configuración de brush - merge con DEFAULT para tener todos los campos
    const presetName = (naturalElement.brushPreset || 'mangaPencil') as BrushPreset;
    const presetConfig = BRUSH_PRESETS[presetName] ?? BRUSH_PRESETS.mangaPencil;

    const config: BrushConfig = {
      ...DEFAULT_BRUSH_CONFIG,
      ...presetConfig,
      ...naturalElement.brushConfig,
      // Ajustar tamaño base al strokeWidth del elemento
      size: {
        base: naturalElement.strokeWidth,
        min: naturalElement.strokeWidth * 0.2,
        max: naturalElement.strokeWidth * 1.5,
      },
    };

    return processStrokePoints(inputPoints, config);
  }, [useNaturalRendering, rawPoints, naturalElement.pressureData, naturalElement.brushPreset, naturalElement.brushConfig, naturalElement.strokeWidth]);

  // Crear patrón de textura si es necesario
  const texturePattern = useMemo(() => {
    if (!useNaturalRendering) return null;

    const presetName = (naturalElement.brushPreset || 'mangaPencil') as BrushPreset;
    const presetConfig = BRUSH_PRESETS[presetName] ?? BRUSH_PRESETS.mangaPencil;
    const textureConfig = naturalElement.brushConfig?.texture || presetConfig.texture || DEFAULT_BRUSH_CONFIG.texture;

    if (!textureConfig || !textureConfig.enabled) return null;

    return createTexturePattern(
      textureConfig.type,
      textureConfig.scale,
      textureConfig.intensity
    );
  }, [useNaturalRendering, naturalElement.brushPreset, naturalElement.brushConfig?.texture]);

  // ============ RENDERING ============

  // Rendering natural con ancho variable
  if (useNaturalRendering && processedPoints.length > 1) {
    return (
      <VariableWidthStroke
        points={processedPoints}
        stroke={naturalElement.stroke}
        opacity={naturalElement.opacity}
        globalCompositeOperation={naturalElement.globalCompositeOperation}
        tension={naturalElement.tension}
        lineCap={naturalElement.lineCap}
        lineJoin={naturalElement.lineJoin}
        texturePattern={texturePattern}
        textureIntensity={0.3}
        listening={false}
      />
    );
  }

  // Rendering legacy (Line simple)
  return (
    <Line
      points={rawPoints}
      stroke={naturalElement.stroke}
      strokeWidth={naturalElement.strokeWidth / zoom}
      tension={naturalElement.tension}
      lineCap={naturalElement.lineCap}
      lineJoin={naturalElement.lineJoin}
      globalCompositeOperation={naturalElement.globalCompositeOperation}
      opacity={naturalElement.opacity}
      listening={false}
    />
  );
});

// ============ EXPORTS ============

export default NaturalStroke;
export { NaturalStroke };
export type { NaturalStrokeProps, NaturalDrawingElement };
