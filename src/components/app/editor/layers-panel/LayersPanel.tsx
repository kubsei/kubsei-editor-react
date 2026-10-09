"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import {
  Layers,
  Plus,
  ChevronDown,
  ChevronRight,
  GripVertical,
  X,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import {
  addLayer,
  setLayersPanelPosition,
  toggleLayersPanelCollapse,
  toggleLayersPanel,
  reorderLayers,
} from "@/lib/store/slices/editorSlice";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LayerItem from "./LayerItem";

const LayersPanel = () => {
  const dispatch = useAppDispatch();
  const { layers, activeLayerId, layersPanel } = useAppSelector(
    (state) => state.editor
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Panel dragging
  const handlePanelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      setIsDraggingPanel(true);
      setDragOffset({
        x: e.clientX - layersPanel.position.x,
        y: e.clientY - layersPanel.position.y,
      });
    },
    [layersPanel.position]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanel) return;

      const newX = Math.max(0, Math.min(window.innerWidth - 280, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));

      dispatch(setLayersPanelPosition({ x: newX, y: newY }));
    };

    const handleMouseUp = () => {
      setIsDraggingPanel(false);
    };

    if (isDraggingPanel) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPanel, dragOffset, dispatch]);

  // Layer drag and drop
  const handleLayerDragStart = useCallback((index: number) => {
    setDraggedLayerIndex(index);
  }, []);

  const handleLayerDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedLayerIndex === null || draggedLayerIndex === index) return;
      setDropTargetIndex(index);
    },
    [draggedLayerIndex]
  );

  const handleLayerDragEnd = useCallback(() => {
    if (draggedLayerIndex !== null && dropTargetIndex !== null && draggedLayerIndex !== dropTargetIndex) {
      dispatch(reorderLayers({ fromIndex: draggedLayerIndex, toIndex: dropTargetIndex }));
    }
    setDraggedLayerIndex(null);
    setDropTargetIndex(null);
  }, [dispatch, draggedLayerIndex, dropTargetIndex]);

  const handleAddLayer = useCallback(() => {
    dispatch(addLayer());
  }, [dispatch]);

  const handleToggleCollapse = useCallback(() => {
    dispatch(toggleLayersPanelCollapse());
  }, [dispatch]);

  const handleClosePanel = useCallback(() => {
    dispatch(toggleLayersPanel());
  }, [dispatch]);

  if (!layersPanel.isOpen) return null;

  // Reverse layers for display (top layer first)
  const reversedLayers = [...layers].reverse();

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={panelRef}
        style={{
          left: layersPanel.position.x,
          top: layersPanel.position.y,
        }}
        className="fixed z-50 w-64 select-none"
      >
        <div className="bg-neutral-900/95 backdrop-blur-md rounded-xl border border-neutral-700/50 shadow-2xl overflow-hidden">
          {/* Header - Draggable area */}
          <div
            onMouseDown={handlePanelMouseDown}
            className={`
              flex items-center justify-between px-3 py-2.5 border-b border-neutral-700/50
              ${isDraggingPanel ? "cursor-grabbing" : "cursor-grab"}
              bg-neutral-800/50
            `}
          >
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="text-neutral-500" />
              <Layers size={16} className="text-neutral-400" />
              <span className="text-sm font-medium text-neutral-200">Capas</span>
              <span className="text-xs text-neutral-500 bg-neutral-700/50 px-1.5 py-0.5 rounded">
                {layers.length}
              </span>
            </div>
            <div className="flex items-center gap-1" data-no-drag>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleCollapse}
                    className="h-6 w-6 text-neutral-400 hover:text-white"
                  >
                    {layersPanel.isCollapsed ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{layersPanel.isCollapsed ? "Expandir" : "Colapsar"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClosePanel}
                    className="h-6 w-6 text-neutral-400 hover:text-red-400"
                  >
                    <X size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Cerrar panel</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Content */}
          {!layersPanel.isCollapsed && (
            <>
              {/* Layer List */}
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                <div className="p-2 space-y-1">
                  {reversedLayers.map((layer, displayIndex) => {
                    const actualIndex = layers.length - 1 - displayIndex;
                    return (
                      <div
                        key={layer.id}
                        draggable
                        onDragStart={() => handleLayerDragStart(actualIndex)}
                        onDragOver={(e) => handleLayerDragOver(e, actualIndex)}
                        onDragEnd={handleLayerDragEnd}
                        className={`
                          ${dropTargetIndex === actualIndex ? "border-t-2 border-indigo-500" : ""}
                          ${draggedLayerIndex === actualIndex ? "opacity-50" : ""}
                        `}
                      >
                        <LayerItem
                          layer={layer}
                          isActive={layer.id === activeLayerId}
                          isOnly={layers.length === 1}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer - Add Layer Button */}
              <div className="px-2 py-2 border-t border-neutral-700/50">
                <Button
                  variant="ghost"
                  onClick={handleAddLayer}
                  className="w-full justify-start gap-2 h-8 text-neutral-400 hover:text-white hover:bg-neutral-700/50"
                >
                  <Plus size={16} />
                  <span className="text-sm">Nueva capa</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LayersPanel;
