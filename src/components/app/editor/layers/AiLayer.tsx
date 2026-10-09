import { useEffect, useState, useRef } from "react";
import { Image, Layer, Line } from "react-konva";
import ReactDOMServer from "react-dom/server";
import { Point, Tool } from "@/types/editor";
import Konva from "konva";

interface AiLayerProps {
  aiPointsSelection: number[];
  cursorPosition: Point | null;
  svgIcon: React.ReactElement | null;
  tool: Tool;
}

const AiLayer = ({
  aiPointsSelection,
  cursorPosition,
  svgIcon,
  tool,
}: AiLayerProps) => {
  const [cursorImage, setCursorImage] = useState<HTMLImageElement | null>(null);
  const [dashOffset, setDashOffset] = useState(0);
  const animationRef = useRef<Konva.Animation | null>(null);
  const layerRef = useRef<Konva.Layer>(null);

  // Load SVG cursor image
  useEffect(() => {
    if (svgIcon) {
      const svgString = ReactDOMServer.renderToStaticMarkup(svgIcon);
      const encodedData = encodeURIComponent(svgString);
      const img = new window.Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodedData}`;
      img.onload = () => {
        setCursorImage(img);
      };
    }
  }, [svgIcon]);

  // Marching ants animation
  useEffect(() => {
    const hasSelection = aiPointsSelection.length > 0;

    if (hasSelection && layerRef.current) {
      // Create animation
      animationRef.current = new Konva.Animation((frame) => {
        if (frame) {
          // Move dash offset to create marching effect
          const newOffset = (frame.time / 50) % 16;
          setDashOffset(newOffset);
        }
      }, layerRef.current);

      animationRef.current.start();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [aiPointsSelection.length]);

  const hasSelection = aiPointsSelection.length > 0;

  return (
    <Layer ref={layerRef}>
      {hasSelection && (
        <>
          {/* White dashed line (background) */}
          <Line
            points={aiPointsSelection}
            stroke="white"
            strokeWidth={2}
            lineJoin="round"
            lineCap="round"
            dash={[8, 8]}
            dashOffset={dashOffset}
            closed={aiPointsSelection.length > 4}
          />
          {/* Black dashed line (foreground, offset for contrast) */}
          <Line
            points={aiPointsSelection}
            stroke="black"
            strokeWidth={2}
            lineJoin="round"
            lineCap="round"
            dash={[8, 8]}
            dashOffset={dashOffset + 8}
            closed={aiPointsSelection.length > 4}
          />
        </>
      )}

      {/* AI cursor icon */}
      {cursorPosition && tool === "ai" && cursorImage && (
        <Image
          image={cursorImage}
          x={cursorPosition.x - 4}
          y={cursorPosition.y - 21}
          width={25}
          height={25}
          listening={false}
          alt=""
        />
      )}
    </Layer>
  );
};

export default AiLayer;
