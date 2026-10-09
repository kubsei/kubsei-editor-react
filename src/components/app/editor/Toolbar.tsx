"use client";

import { useRef, useState } from "react";
import {
  Plus,
  MousePointer2,
  Hand,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  Sparkles,
  Layers,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  setTool,
  setStrokeColor,
  setStrokeWidth,
  setOpacity,
  addImage,
  undo,
  redo,
  toggleLayersPanel,
  setBrushMode,
  setNaturalBrushPreset,
  setStabilizerEnabled,
  setStabilizerStrength,
  setPressureEnabled,
  setPressureSensitivity,
  setSmoothingEnabled,
  setSmoothingStrength,
  setFontSize,
  setFontFamily,
} from "@/lib/store/slices/editorSlice";
import { Tool, BrushMode, NaturalBrushPreset } from "@/types/editor";
import { ShapeType } from "@/types/tools";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ColorPicker } from "@/components/ui/color-picker";
import loaderStyles from "@/components/app/editor/ai/AiFancyLoader.module.css";
import styles from "./Toolbar.module.css";
import ToolButton from "./tools/ToolButton";
import BrushSettingsPopover from "./tools/BrushSettingsPopover";
import ShapeToolPopover from "./tools/ShapeToolPopover";
import TextSettingsPopover from "./tools/TextSettingsPopover";
import Divider from "./tools/Divider";

const Toolbar = () => {
  const dispatch = useAppDispatch();
  const { tool, strokeColor, strokeWidth, opacity, brushSettings, history, layersPanel, fontSize, fontFamily } = useAppSelector(
    (state) => state.editor
  );

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const handleToggleLayersPanel = () => {
    dispatch(toggleLayersPanel());
  };

  const handleUndo = () => {
    if (canUndo) dispatch(undo());
  };

  const handleRedo = () => {
    if (canRedo) dispatch(redo());
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedShape, setSelectedShape] = useState<ShapeType>("rectangle");
  const [recentColors, setRecentColors] = useState<string[]>([]);

  const handleToolChange = (newTool: Tool) => {
    dispatch(setTool(newTool));
  };

  const handleColorChange = (newColor: string) => {
    dispatch(setStrokeColor(newColor));
  };

  const handleStrokeWidthChange = (value: number) => {
    dispatch(setStrokeWidth(value));
  };

  const handleOpacityChange = (value: number) => {
    dispatch(setOpacity(value));
  };

  // Brush settings handlers
  const handleBrushModeChange = (mode: BrushMode) => {
    dispatch(setBrushMode(mode));
  };

  const handlePresetChange = (preset: NaturalBrushPreset) => {
    dispatch(setNaturalBrushPreset(preset));
  };

  const handleStabilizerEnabledChange = (enabled: boolean) => {
    dispatch(setStabilizerEnabled(enabled));
  };

  const handleStabilizerStrengthChange = (strength: number) => {
    dispatch(setStabilizerStrength(strength));
  };

  const handlePressureEnabledChange = (enabled: boolean) => {
    dispatch(setPressureEnabled(enabled));
  };

  const handlePressureSensitivityChange = (sensitivity: number) => {
    dispatch(setPressureSensitivity(sensitivity));
  };

  const handleSmoothingEnabledChange = (enabled: boolean) => {
    dispatch(setSmoothingEnabled(enabled));
  };

  const handleSmoothingStrengthChange = (strength: number) => {
    dispatch(setSmoothingStrength(strength));
  };

  // Text settings handlers
  const handleFontSizeChange = (size: number) => {
    dispatch(setFontSize(size));
  };

  const handleFontFamilyChange = (family: string) => {
    dispatch(setFontFamily(family));
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Por favor selecciona una imagen válida (JPG, PNG, GIF, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        dispatch(
          addImage({
            src,
            width: img.width,
            height: img.height,
          })
        );
      };
      img.src = src;
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  const handleShapeSelect = (shape: ShapeType) => {
    setSelectedShape(shape);
    handleToolChange(shape);
  };

  // Helper to convert hex color to rgba string with alpha
  const hexToRgba = (hex: string, alpha = 1) => {
    const normalized = hex.replace("#", "");
    let r = 0,
      g = 0,
      b = 0;

    if (normalized.length === 3) {
      r = parseInt(normalized[0] + normalized[0], 16);
      g = parseInt(normalized[1] + normalized[1], 16);
      b = parseInt(normalized[2] + normalized[2], 16);
    } else if (normalized.length === 6) {
      r = parseInt(normalized.substring(0, 2), 16);
      g = parseInt(normalized.substring(2, 4), 16);
      b = parseInt(normalized.substring(4, 6), 16);
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <div className={styles.toolbarWrapper}>
          {/* Animated glow layers */}
          <div className={styles.glow} />
          <div className={styles.darkBorderBg} />
          <div className={styles.darkBorderBg} />
          <div className={styles.whiteBorder} />
          <div className={styles.border} />

          {/* Main toolbar content */}
          <div className={styles.toolbarContent}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

          {/* Add button */}
          <ToolButton
            icon={<Plus size={20} />}
            label="Agregar imagen"
            onClick={handleAddClick}
          />

          <Divider />

          {/* Selection tool - no dropdown */}
          <ToolButton
            icon={<MousePointer2 size={20} />}
            label="Seleccionar"
            shortcut="V"
            isActive={tool === "select"}
            onClick={() => handleToolChange("select")}
          />

          {/* Hand/Pan tool */}
          <ToolButton
            icon={<Hand size={20} />}
            label="Mover"
            shortcut="H"
            isActive={tool === "hand"}
            onClick={() => handleToolChange("hand")}
          />

          {/* Drawing tool with natural brush settings */}
          <BrushSettingsPopover
            icon={<Pencil size={20} />}
            label="Lápiz"
            shortcut="P"
            isActive={tool === "pen" || tool === "brush"}
            onToolSelect={() => handleToolChange("pen")}
            strokeWidth={strokeWidth}
            opacity={opacity}
            onStrokeWidthChange={handleStrokeWidthChange}
            onOpacityChange={handleOpacityChange}
            // Natural brush settings
            showNaturalSettings={true}
            brushSettings={brushSettings}
            onBrushModeChange={handleBrushModeChange}
            onPresetChange={handlePresetChange}
            onStabilizerEnabledChange={handleStabilizerEnabledChange}
            onStabilizerStrengthChange={handleStabilizerStrengthChange}
            onPressureEnabledChange={handlePressureEnabledChange}
            onPressureSensitivityChange={handlePressureSensitivityChange}
            onSmoothingEnabledChange={handleSmoothingEnabledChange}
            onSmoothingStrengthChange={handleSmoothingStrengthChange}
          />

          {/* Eraser with simple settings (no natural mode) */}
          <BrushSettingsPopover
            icon={<Eraser size={20} />}
            label="Borrador"
            shortcut="E"
            isActive={tool === "eraser"}
            onToolSelect={() => handleToolChange("eraser")}
            strokeWidth={strokeWidth}
            opacity={opacity}
            onStrokeWidthChange={handleStrokeWidthChange}
            onOpacityChange={handleOpacityChange}
            showNaturalSettings={false}
          />

          {/* Color picker */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <div className="relative p-1 cursor-pointer">
                    {/* compute dynamic styles so glow and shadow match chosen color */}
                    {(() => {
                      const shadowColor = hexToRgba(strokeColor, 0.5);
                      const wrapperStyle: React.CSSProperties = {
                        background: `linear-gradient(120deg, ${strokeColor}, ${hexToRgba(
                          strokeColor,
                          0.9
                        )})`,
                        boxShadow: `0 0 8px 0 ${shadowColor}`,
                      };
                      const glowStyle: React.CSSProperties = {
                        background: `radial-gradient(circle at 30% 30%, ${hexToRgba(
                          strokeColor,
                          0.45
                        )}, ${hexToRgba(strokeColor, 0.18)} 40%, transparent 60%)`,
                      };

                      return (
                        <div
                          className={`${loaderStyles.miniLoader} ${loaderStyles.miniFlow} w-6 h-6 rounded-full border-2 border-neutral-600 cursor-pointer overflow-hidden hover:border-neutral-500 transition-colors`}
                          style={wrapperStyle}>
                          <div
                            className={loaderStyles.miniGlow}
                            style={glowStyle}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Color</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="bottom" className="w-auto p-0 border-neutral-700">
              <ColorPicker
                color={strokeColor}
                onChange={handleColorChange}
                recentColors={recentColors}
                onRecentColorsChange={setRecentColors}
              />
            </PopoverContent>
          </Popover>

          {/* Shapes - unified dropdown */}
          <ShapeToolPopover
            currentTool={tool}
            selectedShape={selectedShape}
            onShapeSelect={handleShapeSelect}
          />

          {/* AI Tool */}
          <ToolButton
            icon={<Sparkles size={20} />}
            label="AI Selection"
            shortcut="A"
            isActive={tool === "ai"}
            onClick={() => handleToolChange("ai")}
          />

          {/* Text Tool with Settings */}
          <TextSettingsPopover
            fontSize={fontSize}
            fontFamily={fontFamily}
            color={strokeColor}
            isActive={tool === "text"}
            onFontSizeChange={handleFontSizeChange}
            onFontFamilyChange={handleFontFamilyChange}
            onColorChange={handleColorChange}
            onClick={() => handleToolChange("text")}
          />

          <Divider />

          {/* Undo/Redo */}
          <ToolButton
            icon={<Undo2 size={20} className={!canUndo ? "opacity-40" : ""} />}
            label="Deshacer"
            shortcut="Ctrl+Z"
            onClick={handleUndo}
          />
          <ToolButton
            icon={<Redo2 size={20} className={!canRedo ? "opacity-40" : ""} />}
            label="Rehacer"
            shortcut="Ctrl+Y"
            onClick={handleRedo}
          />

          <Divider />

          {/* Layers Panel toggle button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={layersPanel.isOpen ? "toolActive" : "tool"}
                size="tool"
                onClick={handleToggleLayersPanel}
                className="flex items-center gap-2 px-3">
                <Layers size={18} />
                <span className="text-sm font-medium">Capas</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{layersPanel.isOpen ? "Ocultar panel de capas" : "Mostrar panel de capas"}</p>
            </TooltipContent>
          </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Toolbar;
