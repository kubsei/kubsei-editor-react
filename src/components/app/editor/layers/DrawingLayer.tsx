import { useEffect, useState, useRef, useMemo } from "react";
import { Layer, Line, Rect, Ellipse, Image as KonvaImage, Text, Transformer } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import {
  Layer as LayerType,
  CanvasElement,
  DrawingElement,
  ShapeElement,
  ImageElement,
  TextElement,
  CanvasState,
  Tool,
} from "@/types/editor";
import { base64ToArrayBuffer, decodeStroke } from "@/lib/stroke/codec";

interface DrawingLayerProps {
  layers: LayerType[];
  elements: Record<string, CanvasElement>;
  canvas: CanvasState;
  selectedElementIds: string[];
  tool: Tool;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onEditText?: (id: string) => void;
}

const DrawingLayer = ({
  layers,
  elements,
  canvas,
  selectedElementIds,
  tool,
  onSelectElement,
  onUpdateElement,
  onEditText,
}: DrawingLayerProps) => {
  const [loadedImages, setLoadedImages] = useState<
    Record<string, HTMLImageElement>
  >({});
  const shapeRefs = useRef<Record<string, Konva.Node>>({});
  const transformerRef = useRef<Konva.Transformer>(null);

  // Load images when elements change
  useEffect(() => {
    const imageElements = Object.values(elements).filter(
      (el): el is ImageElement => el.type === "image"
    );

    imageElements.forEach((imgElement) => {
      if (!loadedImages[imgElement.id]) {
        const img = new window.Image();
        img.src = imgElement.src;
        img.onload = () => {
          setLoadedImages((prev) => ({
            ...prev,
            [imgElement.id]: img,
          }));
        };
      }
    });
  }, [elements, loadedImages]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current) return;

    const selectedNodes = selectedElementIds
      .map((id) => shapeRefs.current[id])
      .filter(Boolean);

    transformerRef.current.nodes(selectedNodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedElementIds]);

  const handleSelect = (e: KonvaEventObject<MouseEvent>, elementId: string) => {
    e.cancelBubble = true;

    // Allow selection with select tool
    if (tool === "select") {
      onSelectElement(elementId);
      return;
    }

    // Allow clicking on text elements when text tool is active to edit them
    if (tool === "text") {
      const element = elements[elementId];
      if (element && element.type === "text" && onEditText) {
        onEditText(elementId);
      }
    }
  };

  const handleTransformEnd = (
    e: KonvaEventObject<Event>,
    elementId: string
  ) => {
    const node = e.target;

    onUpdateElement(elementId, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
  };

  const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
    // Prevent drag from bubbling to Stage
    e.cancelBubble = true;
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, elementId: string) => {
    e.cancelBubble = true;
    onUpdateElement(elementId, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  /**
   * Obtiene los puntos para renderizar un DrawingElement
   * Prioriza buffer binario (si existe) sobre puntos raw
   */
  const getDrawingPoints = (element: DrawingElement): number[] => {
    // Si tiene buffer Base64, decodificar
    if (element.bufferBase64) {
      try {
        const buffer = base64ToArrayBuffer(element.bufferBase64);
        const { flatPoints } = decodeStroke(buffer);
        return flatPoints;
      } catch (error) {
        console.error('[DrawingLayer] Error decoding stroke buffer:', error);
        // Fallback a puntos raw
        return element.points;
      }
    }

    // Fallback: usar puntos raw (durante drawing o elementos legacy)
    return element.points;
  };

  const renderDrawingElement = (element: DrawingElement) => {
    const points = getDrawingPoints(element);

    return (
      <Line
        key={element.id}
        points={points}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth / canvas.zoom}
        tension={element.tension}
        lineCap={element.lineCap}
        lineJoin={element.lineJoin}
        globalCompositeOperation={element.globalCompositeOperation}
        opacity={element.opacity}
      />
    );
  };

  const renderShapeElement = (element: ShapeElement) => {
    const commonProps = {
      ref: (node: Konva.Node | null) => {
        if (node) shapeRefs.current[element.id] = node;
      },
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      scaleX: element.scaleX,
      scaleY: element.scaleY,
      opacity: element.opacity,
      fill: element.fill,
      stroke: element.stroke,
      strokeWidth: element.strokeWidth / canvas.zoom,
      draggable: tool === "select",
      onClick: (e: KonvaEventObject<MouseEvent>) => handleSelect(e, element.id),
      onTap: (e: KonvaEventObject<TouchEvent>) =>
        handleSelect(e as unknown as KonvaEventObject<MouseEvent>, element.id),
      onDragStart: handleDragStart,
      onDragEnd: (e: KonvaEventObject<DragEvent>) => handleDragEnd(e, element.id),
      onTransformEnd: (e: KonvaEventObject<Event>) => handleTransformEnd(e, element.id),
    };

    switch (element.type) {
      case "rectangle":
        return (
          <Rect
            key={element.id}
            {...commonProps}
            width={element.width}
            height={element.height}
          />
        );
      case "ellipse":
        return (
          <Ellipse
            key={element.id}
            {...commonProps}
            // Ellipse uses radiusX/radiusY from center point
            x={element.x + element.width / 2}
            y={element.y + element.height / 2}
            radiusX={element.width / 2}
            radiusY={element.height / 2}
          />
        );
      case "line":
        return (
          <Line
            key={element.id}
            {...commonProps}
            points={[0, 0, element.width, element.height]}
            lineCap="round"
            lineJoin="round"
          />
        );
      default:
        return null;
    }
  };

  const renderImageElement = (element: ImageElement) => {
    const loadedImage = loadedImages[element.id];
    if (!loadedImage) return null;

    return (
      <KonvaImage
        key={element.id}
        ref={(node) => {
          if (node) shapeRefs.current[element.id] = node;
        }}
        image={loadedImage}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        scaleX={element.scaleX}
        scaleY={element.scaleY}
        opacity={element.opacity}
        draggable={tool === "select"}
        onClick={(e) => handleSelect(e, element.id)}
        onTap={(e) =>
          handleSelect(e as unknown as KonvaEventObject<MouseEvent>, element.id)
        }
        onDragStart={handleDragStart}
        onDragEnd={(e) => handleDragEnd(e, element.id)}
        onTransformEnd={(e) => handleTransformEnd(e, element.id)}
      />
    );
  };

  const handleTextDblClick = (e: KonvaEventObject<MouseEvent>, elementId: string) => {
    e.cancelBubble = true;
    if (onEditText) {
      onEditText(elementId);
    }
  };

  const renderTextElement = (element: TextElement) => {
    // Don't render if text is empty
    if (!element.text) return null;

    return (
      <Text
        key={element.id}
        ref={(node) => {
          if (node) shapeRefs.current[element.id] = node;
        }}
        x={element.x}
        y={element.y}
        text={element.text}
        fontSize={element.fontSize}
        fontFamily={element.fontFamily}
        fill={element.fill}
        width={element.width}
        rotation={element.rotation}
        scaleX={element.scaleX}
        scaleY={element.scaleY}
        opacity={element.opacity}
        draggable={tool === "select"}
        onClick={(e) => handleSelect(e, element.id)}
        onDblClick={(e) => handleTextDblClick(e, element.id)}
        onTap={(e) =>
          handleSelect(e as unknown as KonvaEventObject<MouseEvent>, element.id)
        }
        onDblTap={(e) =>
          handleTextDblClick(e as unknown as KonvaEventObject<MouseEvent>, element.id)
        }
        onDragStart={handleDragStart}
        onDragEnd={(e) => handleDragEnd(e, element.id)}
        onTransformEnd={(e) => handleTransformEnd(e, element.id)}
      />
    );
  };

  const renderElement = (element: CanvasElement) => {
    switch (element.type) {
      case "drawing":
        return renderDrawingElement(element);
      case "rectangle":
      case "ellipse":
      case "line":
        return renderShapeElement(element as ShapeElement);
      case "image":
        return renderImageElement(element);
      case "text":
        return renderTextElement(element);
      default:
        return null;
    }
  };

  return (
    <>
      {layers.map((layer) => (
        <Layer key={layer.id} visible={layer.visible} opacity={layer.opacity}>
          {layer.elements.map((elementId) => {
            const element = elements[elementId];
            if (!element) return null;
            return renderElement(element);
          })}

          {/* Transformer for selected elements */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit minimum size
              if (newBox.width < 10 || newBox.height < 10) {
                return oldBox;
              }
              return newBox;
            }}
            anchorSize={8}
            anchorCornerRadius={2}
            anchorStroke="#6366f1"
            anchorFill="#ffffff"
            borderStroke="#6366f1"
            borderStrokeWidth={1}
            rotateAnchorOffset={20}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ]}
          />
        </Layer>
      ))}
    </>
  );
};

export default DrawingLayer;
