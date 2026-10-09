import { CanvasState } from "@/types/editor";
import { Layer, Rect } from "react-konva";

interface BackgroundLayerProps {
  canvas: CanvasState;
}

const BackgroundLayer = ({ canvas }: BackgroundLayerProps) => {
  return (
    <Layer>
      <Rect
        x={0}
        y={0}
        width={canvas.width}
        height={canvas.height}
        fill="#ffffff"
        shadowColor="#000000"
        shadowBlur={20}
        shadowOpacity={0.3}
        shadowOffsetX={0}
        shadowOffsetY={0}
      />
    </Layer>
  );
};

export default BackgroundLayer;
