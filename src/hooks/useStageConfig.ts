import { useRef, useEffect, useState, useCallback } from "react";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  startDrawing,
  continueDrawing,
  endDrawing,
  startShape,
  updateShape,
  endShape,
  setOffset,
  setZoom,
  clearSelection,
  startAiSelection,
  continueAiSelection,
  endAiSelection,
  setAiCursorPosition,
  startTextEditing,
  finishTextEditing,
} from "@/lib/store/slices/editorSlice";
import { StageProps, Tool } from "@/types/editor";

export interface UseStageConfigReturn {
  stageRef: React.RefObject<Konva.Stage | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  stageProps: StageProps;
}

const isShapeTool = (tool: Tool): tool is 'rectangle' | 'ellipse' | 'line' => {
  return tool === 'rectangle' || tool === 'ellipse' || tool === 'line';
};

export const useStageConfig = (): UseStageConfigReturn => {
  const dispatch = useAppDispatch();
  const stageRef = useRef<Konva.Stage | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const { tool, canvas, isDrawing, ai, textEditing } = useAppSelector(
    (state) => state.editor
  );

  const isInitializedRef = useRef(false);

  // Responsive stage size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Center canvas on initial load
  useEffect(() => {
    if (
      !isInitializedRef.current &&
      containerRef.current &&
      stageSize.width > 0
    ) {
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;

      // Calculate offset to center the canvas
      const initialOffsetX = (containerWidth - canvas.width * canvas.zoom) / 2;
      const initialOffsetY =
        (containerHeight - canvas.height * canvas.zoom) / 2;

      dispatch(setOffset({ x: initialOffsetX, y: initialOffsetY }));
      // mark initialized using a ref to avoid triggering a re-render inside the effect
      isInitializedRef.current = true;
    }
  }, [dispatch, stageSize, canvas.width, canvas.height, canvas.zoom]);

  // Get relative pointer position considering zoom and offset
  const getRelativePointerPosition = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return null;

      const pointer = stage.getPointerPosition();
      if (!pointer) return null;

      return {
        x: (pointer.x - canvas.offsetX) / canvas.zoom,
        y: (pointer.y - canvas.offsetY) / canvas.zoom,
      };
    },
    [canvas.offsetX, canvas.offsetY, canvas.zoom]
  );

  // Mouse Down Handler
  const onMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (tool === "hand") return;

      if (tool === "select") {
        if (e.target === e.target.getStage()) {
          dispatch(clearSelection());
        }
        return;
      }

      if (tool === "ai") {
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startAiSelection(pos));
        }
        return;
      }

      // Handle text tool
      if (tool === "text") {
        // If already editing text, finish the current editing session
        if (textEditing.isEditing) {
          dispatch(finishTextEditing());
        }
        // Start new text at click position
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startTextEditing(pos));
        }
        return;
      }

      // Handle shape tools
      if (isShapeTool(tool)) {
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startShape({ point: pos, shapeType: tool }));
        }
        return;
      }

      if (tool === "pen" || tool === "brush" || tool === "eraser") {
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startDrawing(pos));
        }
      }
    },
    [dispatch, tool, getRelativePointerPosition, textEditing.isEditing]
  );

  // Mouse Move Handler
  const onMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const pos = getRelativePointerPosition(e);

      // Update AI cursor position
      if (tool === "ai" && pos) {
        dispatch(setAiCursorPosition(pos));
      }

      // Handle AI selection
      if (tool === "ai" && ai.isSelecting && pos) {
        dispatch(continueAiSelection(pos));
        return;
      }

      // Handle drawing/shapes
      if (!isDrawing) return;

      // Handle shape tools
      if (isShapeTool(tool) && pos) {
        dispatch(updateShape(pos));
        return;
      }

      if (tool === "pen" || tool === "brush" || tool === "eraser") {
        if (pos) {
          dispatch(continueDrawing(pos));
        }
      }
    },
    [dispatch, isDrawing, ai.isSelecting, tool, getRelativePointerPosition]
  );

  // Mouse Up Handler
  const onMouseUp = useCallback(() => {
    if (tool === "ai" && ai.isSelecting) {
      dispatch(endAiSelection());
      return;
    }

    // Handle shape tools
    if (isShapeTool(tool) && isDrawing) {
      dispatch(endShape());
      return;
    }

    if (isDrawing) {
      dispatch(endDrawing());
    }
  }, [dispatch, isDrawing, ai.isSelecting, tool]);

  // Mouse Leave Handler
  const onMouseLeave = useCallback(() => {
    if (tool === "ai") {
      dispatch(setAiCursorPosition(null));
    }
    if (ai.isSelecting) {
      dispatch(endAiSelection());
    }
    if (isDrawing) {
      if (isShapeTool(tool)) {
        dispatch(endShape());
      } else {
        dispatch(endDrawing());
      }
    }
  }, [dispatch, tool, ai.isSelecting, isDrawing]);

  // Wheel Handler (Zoom)
  const onWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = e.target.getStage();
      if (!stage) return;

      const oldZoom = canvas.zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.1;
      const newZoom = e.evt.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
      const clampedZoom = Math.min(Math.max(newZoom, 0.1), 5);

      const mousePointTo = {
        x: (pointer.x - canvas.offsetX) / oldZoom,
        y: (pointer.y - canvas.offsetY) / oldZoom,
      };

      const newOffset = {
        x: pointer.x - mousePointTo.x * clampedZoom,
        y: pointer.y - mousePointTo.y * clampedZoom,
      };

      dispatch(setZoom(clampedZoom));
      dispatch(setOffset(newOffset));
    },
    [dispatch, canvas.zoom, canvas.offsetX, canvas.offsetY]
  );

  // Drag End Handler - Only for Stage drag (hand tool)
  const onDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      // Only update offset if the dragged target is the Stage itself
      const stage = e.target.getStage();
      if (e.target !== stage) return;

      dispatch(
        setOffset({
          x: e.target.x(),
          y: e.target.y(),
        })
      );
    },
    [dispatch]
  );

  // Touch Handlers
  const onTouchStart = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      if (tool === "hand") return;

      if (tool === "ai") {
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startAiSelection(pos));
        }
        return;
      }

      // Handle text tool
      if (tool === "text") {
        if (textEditing.isEditing) {
          dispatch(finishTextEditing());
        }
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startTextEditing(pos));
        }
        return;
      }

      // Handle shape tools
      if (isShapeTool(tool)) {
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startShape({ point: pos, shapeType: tool }));
        }
        return;
      }

      if (tool === "pen" || tool === "brush" || tool === "eraser") {
        const pos = getRelativePointerPosition(e);
        if (pos) {
          dispatch(startDrawing(pos));
        }
      }
    },
    [dispatch, tool, getRelativePointerPosition, textEditing.isEditing]
  );

  const onTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const pos = getRelativePointerPosition(e);

      if (tool === "ai" && ai.isSelecting && pos) {
        dispatch(continueAiSelection(pos));
        return;
      }

      if (!isDrawing) return;

      // Handle shape tools
      if (isShapeTool(tool) && pos) {
        dispatch(updateShape(pos));
        return;
      }

      if (tool === "pen" || tool === "brush" || tool === "eraser") {
        if (pos) {
          dispatch(continueDrawing(pos));
        }
      }
    },
    [dispatch, isDrawing, ai.isSelecting, tool, getRelativePointerPosition]
  );

  const onTouchEnd = useCallback(() => {
    if (tool === "ai" && ai.isSelecting) {
      dispatch(endAiSelection());
      return;
    }

    if (isDrawing) {
      if (isShapeTool(tool)) {
        dispatch(endShape());
      } else {
        dispatch(endDrawing());
      }
    }
  }, [dispatch, isDrawing, ai.isSelecting, tool]);

  // Stage props object for spread
  const stageProps: StageProps = {
    width: stageSize.width,
    height: stageSize.height,
    scaleX: canvas.zoom,
    scaleY: canvas.zoom,
    x: canvas.offsetX,
    y: canvas.offsetY,
    draggable: tool === "hand",
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onWheel,
    onDragEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };

  return {
    stageRef,
    containerRef,
    stageProps,
  };
};

export default useStageConfig;
