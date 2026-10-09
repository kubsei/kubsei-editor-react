"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  MoreHorizontal,
  GripVertical,
  Pencil,
} from "lucide-react";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  setActiveLayer,
  toggleLayerVisibility,
  toggleLayerLock,
  setLayerOpacity,
  renameLayer,
  deleteLayer,
  duplicateLayer,
} from "@/lib/store/slices/editorSlice";
import { Layer } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import LayerThumbnail from "./LayerThumbnail";

interface LayerItemProps {
  layer: Layer;
  isActive: boolean;
  isOnly: boolean;
}

const LayerItem = ({ layer, isActive, isOnly }: LayerItemProps) => {
  const dispatch = useAppDispatch();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSelect = useCallback(() => {
    if (!isEditing) {
      dispatch(setActiveLayer(layer.id));
    }
  }, [dispatch, layer.id, isEditing]);

  const handleToggleVisibility = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(toggleLayerVisibility(layer.id));
    },
    [dispatch, layer.id]
  );

  const handleToggleLock = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dispatch(toggleLayerLock(layer.id));
    },
    [dispatch, layer.id]
  );

  const handleStartEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(layer.name);
    setIsEditing(true);
  }, [layer.name]);

  const handleFinishEditing = useCallback(() => {
    if (editName.trim() && editName !== layer.name) {
      dispatch(renameLayer({ id: layer.id, name: editName.trim() }));
    }
    setIsEditing(false);
  }, [dispatch, layer.id, layer.name, editName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleFinishEditing();
      } else if (e.key === "Escape") {
        setEditName(layer.name);
        setIsEditing(false);
      }
    },
    [handleFinishEditing, layer.name]
  );

  const handleOpacityChange = useCallback(
    (value: number[]) => {
      dispatch(setLayerOpacity({ id: layer.id, opacity: value[0] }));
    },
    [dispatch, layer.id]
  );

  const handleDelete = useCallback(() => {
    dispatch(deleteLayer(layer.id));
  }, [dispatch, layer.id]);

  const handleDuplicate = useCallback(() => {
    dispatch(duplicateLayer(layer.id));
  }, [dispatch, layer.id]);

  return (
    <div
      onClick={handleSelect}
      data-no-drag
      className={`
        group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all
        ${isActive
          ? "bg-indigo-600/20 border border-indigo-500/50"
          : "hover:bg-neutral-700/50 border border-transparent"
        }
        ${!layer.visible ? "opacity-60" : ""}
      `}
    >
      {/* Drag Handle */}
      <div className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-neutral-400 shrink-0">
        <GripVertical size={12} />
      </div>

      {/* Layer Thumbnail Preview */}
      <div className="shrink-0">
        <LayerThumbnail layer={layer} width={64} height={48} />
      </div>

      {/* Layer Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Layer Name */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-1 py-0.5 text-sm bg-neutral-700 border border-neutral-600 rounded text-white outline-none focus:border-indigo-500"
          />
        ) : (
          <span
            className="text-sm text-neutral-200 truncate cursor-text leading-tight"
            onDoubleClick={handleStartEditing}
          >
            {layer.name}
          </span>
        )}

        {/* Element count and opacity */}
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          {layer.opacity < 1 && (
            <span className="tabular-nums">
              {Math.round(layer.opacity * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Visibility Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggleVisibility}
              className={`
                p-1 rounded transition-colors
                ${layer.visible
                  ? "text-neutral-400 hover:text-white"
                  : "text-neutral-600 hover:text-neutral-400"
                }
              `}
            >
              {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{layer.visible ? "Ocultar" : "Mostrar"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Lock Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleToggleLock}
              className={`
                p-1 rounded transition-colors
                ${layer.locked
                  ? "text-amber-500 hover:text-amber-400"
                  : "text-neutral-500 hover:text-neutral-400 opacity-0 group-hover:opacity-100"
                }
              `}
            >
              {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{layer.locked ? "Desbloquear" : "Bloquear"}</p>
          </TooltipContent>
        </Tooltip>

        {/* More Options Menu */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-48 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              {/* Rename */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEditing(e);
                }}
                className="w-full justify-start gap-2 h-8 text-neutral-300 hover:text-white"
              >
                <Pencil size={14} />
                <span>Renombrar</span>
              </Button>

              {/* Opacity Control */}
              <div className="px-2 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400">Opacidad</span>
                  <span className="text-xs text-neutral-300 tabular-nums">
                    {Math.round(layer.opacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[layer.opacity]}
                  onValueChange={handleOpacityChange}
                  min={0}
                  max={1}
                  step={0.01}
                  className="w-full"
                />
              </div>

              <div className="border-t border-neutral-700 my-1" />

              {/* Duplicate */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDuplicate}
                className="w-full justify-start gap-2 h-8 text-neutral-300 hover:text-white"
              >
                <Copy size={14} />
                <span>Duplicar</span>
              </Button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isOnly}
                className="w-full justify-start gap-2 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
                <span>Eliminar</span>
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default LayerItem;
