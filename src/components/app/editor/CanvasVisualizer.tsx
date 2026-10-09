"use client";

import { forwardRef, useImperativeHandle } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import {
  selectElement,
  clearSelection,
  updateElement,
  editExistingText,
} from "@/lib/store/slices/editorSlice";
import { useStageConfig } from "@/hooks";
import { getCursor } from "@/utils";
import { Sparkles } from "lucide-react";
import { CanvasElement } from "@/types/editor";
import BackgroundLayer from "./layers/BackgroundLayer";
import DrawingLayer from "./layers/DrawingLayer";
import AiLayer from "./layers/AiLayer";
import TextInputOverlay from "./canvas/TextInputOverlay";

export interface CanvasVisualizerRef {
  getStage: () => Konva.Stage | null;
}

const CanvasVisualizer = forwardRef<CanvasVisualizerRef>((_, ref) => {
  const dispatch = useAppDispatch();
  const { tool, elements, layers, canvas, ai, selectedElementIds } = useAppSelector(
    (state) => state.editor
  );

  const { stageRef, containerRef, stageProps } = useStageConfig();

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
  }));

  const handleSelectElement = (id: string | null) => {
    if (id) {
      dispatch(selectElement(id));
    } else {
      dispatch(clearSelection());
    }
  };

  const handleUpdateElement = (id: string, updates: Partial<CanvasElement>) => {
    dispatch(updateElement({ id, updates }));
  };

  const handleEditText = (id: string) => {
    dispatch(editExistingText(id));
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      style={{
        cursor: getCursor(tool),
        backgroundColor: "#1a1a2e",
        backgroundImage: "url('/endless-constellation.svg')",
        backgroundRepeat: "repeat",
      }}>
      <Stage ref={stageRef} {...stageProps}>
        <BackgroundLayer canvas={canvas} />
        <DrawingLayer
          layers={layers}
          elements={elements}
          canvas={canvas}
          selectedElementIds={selectedElementIds}
          tool={tool}
          onSelectElement={handleSelectElement}
          onUpdateElement={handleUpdateElement}
          onEditText={handleEditText}
        />
        <AiLayer
          aiPointsSelection={ai.selectionPoints}
          cursorPosition={ai.cursorPosition}
          svgIcon={<Sparkles size={20} color="#a855f7" />}
          tool={tool}
        />
      </Stage>
      <TextInputOverlay containerRef={containerRef} />
    </div>
  );
});

CanvasVisualizer.displayName = "CanvasVisualizer";

export default CanvasVisualizer;
