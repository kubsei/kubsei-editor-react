/**
 * VariableWidthStroke - Renderizador de trazos con ancho variable
 *
 * Usa Konva Shape con sceneFunc personalizada para renderizar
 * trazos que varían en ancho según presión y velocidad.
 *
 * Técnica: "Outline stroke" - genera contorno a cada lado del path central
 * basándose en el ancho calculado para cada punto.
 *
 * Ventajas sobre Line simple:
 * - Ancho variable por punto
 * - Extremos naturales (taper)
 * - Soporte para texturas
 */

import React, { memo, useMemo } from 'react';
import { Shape } from 'react-konva';
import Konva from 'konva';
import { Context } from 'konva/lib/Context';
import { SmoothedPoint } from '@/lib/brush/types';

// ============ TYPES ============

interface VariableWidthStrokeProps {
  // Puntos procesados con ancho calculado
  points: SmoothedPoint[];

  // Estilo
  stroke: string;
  opacity?: number;
  globalCompositeOperation?: GlobalCompositeOperation;

  // Opciones de rendering
  tension?: number; // Tensión de curva (0-1)
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';

  // Textura (opcional)
  texturePattern?: CanvasPattern | null;
  textureIntensity?: number;

  // Transform
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;

  // Otros
  listening?: boolean;
}

// ============ COMPONENT ============

const VariableWidthStroke = memo(function VariableWidthStroke({
  points,
  stroke,
  opacity = 1,
  globalCompositeOperation = 'source-over',
  tension = 0.5,
  lineCap = 'round',
  lineJoin = 'round',
  texturePattern = null,
  textureIntensity = 0.5,
  x = 0,
  y = 0,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
  listening = false,
}: VariableWidthStrokeProps) {
  // Pre-calcular los contornos izquierdo y derecho
  const { leftOutline, rightOutline } = useMemo(() => {
    return calculateOutlines(points);
  }, [points]);

  // Scene function personalizada para renderizar el trazo
  const sceneFunc = useMemo(() => {
    return (context: Context, shape: Konva.Shape) => {
      const ctx = context._context;

      if (points.length < 2) {
        // Punto único: dibujar círculo
        if (points.length === 1) {
          const p = points[0];
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.width / 2, 0, Math.PI * 2);
          ctx.fillStyle = stroke;
          ctx.fill();
        }
        return;
      }

      // Configurar estilo
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = globalCompositeOperation;

      // Dibujar el trazo como un path cerrado
      ctx.beginPath();

      // Lado izquierdo (hacia adelante)
      ctx.moveTo(leftOutline[0].x, leftOutline[0].y);

      for (let i = 1; i < leftOutline.length; i++) {
        const prev = leftOutline[i - 1];
        const curr = leftOutline[i];

        if (tension > 0 && i < leftOutline.length - 1) {
          // Curva con control points para suavidad
          const next = leftOutline[i + 1];
          const cp = calculateControlPoint(prev, curr, next, tension);
          ctx.quadraticCurveTo(cp.x, cp.y, curr.x, curr.y);
        } else {
          ctx.lineTo(curr.x, curr.y);
        }
      }

      // Punta final (semicírculo)
      const lastPoint = points[points.length - 1];
      const lastWidth = lastPoint.width / 2;
      const lastAngle = calculateAngle(
        points[points.length - 2],
        lastPoint
      );
      ctx.arc(
        lastPoint.x,
        lastPoint.y,
        lastWidth,
        lastAngle - Math.PI / 2,
        lastAngle + Math.PI / 2,
        false
      );

      // Lado derecho (hacia atrás)
      for (let i = rightOutline.length - 1; i >= 0; i--) {
        const curr = rightOutline[i];

        if (tension > 0 && i > 0 && i < rightOutline.length - 1) {
          const prev = rightOutline[i + 1];
          const next = rightOutline[i - 1];
          const cp = calculateControlPoint(prev, curr, next, tension);
          ctx.quadraticCurveTo(cp.x, cp.y, curr.x, curr.y);
        } else {
          ctx.lineTo(curr.x, curr.y);
        }
      }

      // Punta inicial (semicírculo)
      const firstPoint = points[0];
      const firstWidth = firstPoint.width / 2;
      const firstAngle = calculateAngle(firstPoint, points[1]);
      ctx.arc(
        firstPoint.x,
        firstPoint.y,
        firstWidth,
        firstAngle + Math.PI / 2,
        firstAngle - Math.PI / 2,
        true
      );

      ctx.closePath();

      // Rellenar con color o textura
      if (texturePattern && textureIntensity > 0) {
        // Capa base de color
        ctx.fillStyle = stroke;
        ctx.fill();

        // Capa de textura con blend
        ctx.globalAlpha = opacity * textureIntensity;
        ctx.fillStyle = texturePattern;
        ctx.fill();
      } else {
        ctx.fillStyle = stroke;
        ctx.fill();
      }

      // Reset global alpha
      ctx.globalAlpha = 1;
    };
  }, [points, leftOutline, rightOutline, stroke, opacity, tension, globalCompositeOperation, texturePattern, textureIntensity]);

  // Hit function para detección de clicks
  const hitFunc = useMemo(() => {
    return (context: Context, shape: Konva.Shape) => {
      const ctx = context._context;

      if (points.length < 2) return;

      ctx.beginPath();

      // Simplificado: solo el path central con stroke grueso
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.lineWidth = Math.max(...points.map(p => p.width)) + 10;
      ctx.lineCap = lineCap;
      ctx.lineJoin = lineJoin;
      ctx.stroke();
      context.fillStrokeShape(shape);
    };
  }, [points, lineCap, lineJoin]);

  if (points.length === 0) return null;

  return (
    <Shape
      x={x}
      y={y}
      rotation={rotation}
      scaleX={scaleX}
      scaleY={scaleY}
      sceneFunc={sceneFunc}
      hitFunc={hitFunc}
      listening={listening}
    />
  );
});

// ============ HELPER FUNCTIONS ============

interface Point2D {
  x: number;
  y: number;
}

/**
 * Calcula los contornos izquierdo y derecho del trazo
 */
function calculateOutlines(points: SmoothedPoint[]): {
  leftOutline: Point2D[];
  rightOutline: Point2D[];
} {
  const leftOutline: Point2D[] = [];
  const rightOutline: Point2D[] = [];

  if (points.length < 2) {
    if (points.length === 1) {
      const p = points[0];
      const w = p.width / 2;
      return {
        leftOutline: [{ x: p.x - w, y: p.y }],
        rightOutline: [{ x: p.x + w, y: p.y }],
      };
    }
    return { leftOutline: [], rightOutline: [] };
  }

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const width = current.width / 2;

    // Calcular dirección perpendicular
    let perpX: number;
    let perpY: number;

    if (i === 0) {
      // Primer punto: usar dirección hacia el siguiente
      const next = points[i + 1];
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      perpX = -dy / len;
      perpY = dx / len;
    } else if (i === points.length - 1) {
      // Último punto: usar dirección desde el anterior
      const prev = points[i - 1];
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      perpX = -dy / len;
      perpY = dx / len;
    } else {
      // Punto medio: promedio de direcciones
      const prev = points[i - 1];
      const next = points[i + 1];

      const dx1 = current.x - prev.x;
      const dy1 = current.y - prev.y;
      const dx2 = next.x - current.x;
      const dy2 = next.y - current.y;

      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

      // Normalizar y promediar
      const nx1 = -dy1 / len1;
      const ny1 = dx1 / len1;
      const nx2 = -dy2 / len2;
      const ny2 = dx2 / len2;

      perpX = (nx1 + nx2) / 2;
      perpY = (ny1 + ny2) / 2;

      // Renormalizar
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      perpX /= perpLen;
      perpY /= perpLen;
    }

    // Generar puntos de contorno
    leftOutline.push({
      x: current.x + perpX * width,
      y: current.y + perpY * width,
    });

    rightOutline.push({
      x: current.x - perpX * width,
      y: current.y - perpY * width,
    });
  }

  return { leftOutline, rightOutline };
}

/**
 * Calcula el ángulo entre dos puntos
 */
function calculateAngle(p1: Point2D, p2: Point2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Calcula un punto de control para curvas suaves
 */
function calculateControlPoint(
  prev: Point2D,
  curr: Point2D,
  next: Point2D,
  tension: number
): Point2D {
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;

  return {
    x: curr.x + dx * tension * 0.25,
    y: curr.y + dy * tension * 0.25,
  };
}

// ============ EXPORTS ============

export default VariableWidthStroke;
export { VariableWidthStroke };
export type { VariableWidthStrokeProps };
