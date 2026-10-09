"use client";

import { useEffect, useRef, useMemo } from "react";
import { useAppSelector } from "@/lib/store/hooks";
import {
  Layer as LayerType,
  DrawingElement,
  ShapeElement,
  ImageElement,
} from "@/types/editor";

interface LayerThumbnailProps {
  layer: LayerType;
  width?: number;
  height?: number;
}

// Drawing helper functions (defined outside component to avoid re-creation)
const drawDrawingElement = (ctx: CanvasRenderingContext2D, element: DrawingElement) => {
  if (element.points.length < 4) return;

  ctx.beginPath();
  ctx.strokeStyle = element.stroke;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = element.lineCap as CanvasLineCap;
  ctx.lineJoin = element.lineJoin as CanvasLineJoin;

  // Apply composite operation (this is key for eraser)
  ctx.globalCompositeOperation = element.globalCompositeOperation as GlobalCompositeOperation;

  // Draw the path with tension (simplified bezier)
  const points = element.points;
  ctx.moveTo(points[0], points[1]);

  if (points.length === 4) {
    ctx.lineTo(points[2], points[3]);
  } else {
    // Use quadratic curves for smoother lines
    for (let i = 2; i < points.length - 2; i += 2) {
      const xc = (points[i] + points[i + 2]) / 2;
      const yc = (points[i + 1] + points[i + 3]) / 2;
      ctx.quadraticCurveTo(points[i], points[i + 1], xc, yc);
    }
    // Last point
    ctx.lineTo(points[points.length - 2], points[points.length - 1]);
  }

  ctx.stroke();

  // Reset composite operation
  ctx.globalCompositeOperation = "source-over";
};

const drawShapeElement = (ctx: CanvasRenderingContext2D, element: ShapeElement) => {
  ctx.save();
  ctx.translate(element.x, element.y);
  ctx.rotate((element.rotation * Math.PI) / 180);
  ctx.scale(element.scaleX, element.scaleY);

  if (element.fill) {
    ctx.fillStyle = element.fill;
  }
  if (element.stroke) {
    ctx.strokeStyle = element.stroke;
    ctx.lineWidth = element.strokeWidth;
  }

  switch (element.type) {
    case "rectangle":
      ctx.beginPath();
      ctx.rect(0, 0, element.width, element.height);
      if (element.fill) ctx.fill();
      if (element.stroke) ctx.stroke();
      break;

    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(
        element.width / 2,
        element.height / 2,
        element.width / 2,
        element.height / 2,
        0,
        0,
        Math.PI * 2
      );
      if (element.fill) ctx.fill();
      if (element.stroke) ctx.stroke();
      break;

    case "line":
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(element.width, element.height);
      ctx.lineCap = "round";
      ctx.stroke();
      break;
  }

  ctx.restore();
};

const drawImageElement = async (
  ctx: CanvasRenderingContext2D,
  element: ImageElement,
  imageCache: Map<string, HTMLImageElement>
) => {
  let img = imageCache.get(element.id);

  if (!img) {
    img = new Image();
    img.crossOrigin = "anonymous";
    img.src = element.src;

    await new Promise<void>((resolve) => {
      img!.onload = () => {
        imageCache.set(element.id, img!);
        resolve();
      };
      img!.onerror = () => resolve();
    });
  }

  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(element.x, element.y);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.scale(element.scaleX, element.scaleY);
    ctx.drawImage(img, 0, 0, element.width, element.height);
    ctx.restore();
  }
};

const LayerThumbnail = ({ layer, width = 56, height = 42 }: LayerThumbnailProps) => {
  const { elements, canvas } = useAppSelector((state) => state.editor);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Calculate scale to fit canvas in thumbnail
  const scale = useMemo(() => {
    const scaleX = width / canvas.width;
    const scaleY = height / canvas.height;
    return Math.min(scaleX, scaleY);
  }, [width, height, canvas.width, canvas.height]);

  // Get elements for this layer
  const layerElements = useMemo(() => {
    return layer.elements
      .map((id) => elements[id])
      .filter(Boolean);
  }, [layer.elements, elements]);

  // Render to canvas using offscreen canvas for correct compositing
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    const render = async () => {
      // Clear the visible canvas and draw white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Create an offscreen canvas at full resolution for drawing content
      const offscreen = document.createElement("canvas");
      offscreen.width = canvas.width;
      offscreen.height = canvas.height;
      const offCtx = offscreen.getContext("2d");
      if (!offCtx) return;

      // Start with transparent background on offscreen - white bg is on visible canvas
      // Draw a white rect that can be erased
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw each element on offscreen canvas
      for (const element of layerElements) {
        if (!element.visible) continue;

        offCtx.save();
        offCtx.globalAlpha = element.opacity;

        switch (element.type) {
          case "drawing":
            drawDrawingElement(offCtx, element);
            break;
          case "rectangle":
          case "ellipse":
          case "line":
            drawShapeElement(offCtx, element as ShapeElement);
            break;
          case "image":
            await drawImageElement(offCtx, element, imageCache.current);
            break;
        }

        offCtx.restore();
      }

      // Copy the offscreen content to visible canvas (scaled down)
      // Areas erased in offscreen will show the white background of visible canvas
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
    };

    render();
  }, [layerElements, scale, canvas.width, canvas.height, width, height]);

  // Show empty state if no elements
  const isEmpty = layerElements.length === 0;

  return (
    <div
      className="relative rounded-md overflow-hidden border border-neutral-700/50"
      style={{ width, height, backgroundColor: "#ffffff" }}
    >
      {isEmpty ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <div className="w-4 h-4 border border-dashed border-neutral-600 rounded-sm" />
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0"
          style={{
            opacity: layer.opacity,
          }}
        />
      )}

      {/* Visibility overlay */}
      {!layer.visible && (
        <div className="absolute inset-0 bg-neutral-900/70 flex items-center justify-center">
          <div className="w-5 h-0.5 bg-neutral-500 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default LayerThumbnail;
