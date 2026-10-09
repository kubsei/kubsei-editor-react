import { BrushSettingsPopoverProps } from "@/types/tools";
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
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { NaturalBrushSettings } from "./NaturalBrushSettings";
import { cn } from "@/lib/utils";

const BrushSettingsPopover = ({
  icon,
  label,
  shortcut,
  isActive,
  onToolSelect,
  strokeWidth,
  opacity,
  onStrokeWidthChange,
  onOpacityChange,
  // Natural brush props
  brushSettings,
  onBrushModeChange,
  onPresetChange,
  onStabilizerEnabledChange,
  onStabilizerStrengthChange,
  onPressureEnabledChange,
  onPressureSensitivityChange,
  onSmoothingEnabledChange,
  onSmoothingStrengthChange,
  showNaturalSettings = false,
}: BrushSettingsPopoverProps) => {
  const isNaturalMode = brushSettings?.mode === "natural";

  // Simple mode (for eraser or when natural settings not enabled)
  if (!showNaturalSettings || !brushSettings) {
    return (
      <div className="flex items-center">
        {/* Tool button - only selects the tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isActive ? "toolActive" : "tool"}
              size="tool"
              onClick={onToolSelect}
              className="rounded-r-none pr-1 cursor-pointer">
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>
              {label}
              {shortcut && (
                <span className="ml-2 text-neutral-400">{shortcut}</span>
              )}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Dropdown arrow - only opens popover */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant={isActive ? "toolActive" : "tool"}
                  size="tool"
                  className="rounded-l-none pl-0 pr-1.5 min-w-0">
                  <ChevronDown size={12} className="opacity-60" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Ajustes de {label.toLowerCase()}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent side="bottom" className="w-64">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-300">Grosor</span>
                  <span className="text-sm text-neutral-400">
                    {strokeWidth}px
                  </span>
                </div>
                <Slider
                  value={[strokeWidth]}
                  onValueChange={(values) => onStrokeWidthChange(values[0])}
                  min={1}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-300">Opacidad</span>
                  <span className="text-sm text-neutral-400">
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[opacity * 100]}
                  onValueChange={(values) => onOpacityChange(values[0] / 100)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Natural brush mode (for pen/brush tool)
  return (
    <div className="flex items-center">
      {/* Tool button with natural mode indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "toolActive" : "tool"}
            size="tool"
            onClick={onToolSelect}
            className={cn(
              "rounded-r-none pr-1 cursor-pointer relative",
              isNaturalMode && isActive && "ring-1 ring-indigo-500/50"
            )}>
            {icon}
            {/* Natural mode indicator */}
            {isNaturalMode && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {label}
            {isNaturalMode && " (Natural)"}
            {shortcut && (
              <span className="ml-2 text-neutral-400">{shortcut}</span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Dropdown arrow - opens full settings */}
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant={isActive ? "toolActive" : "tool"}
                size="tool"
                className={cn(
                  "rounded-l-none pl-0 pr-1.5 min-w-0",
                  isNaturalMode && isActive && "ring-1 ring-indigo-500/50"
                )}>
                <ChevronDown size={12} className="opacity-60" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Ajustes de {label.toLowerCase()}</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="bottom" className="w-auto p-4" align="start">
          <NaturalBrushSettings
            brushSettings={brushSettings}
            strokeWidth={strokeWidth}
            opacity={opacity}
            onStrokeWidthChange={onStrokeWidthChange}
            onOpacityChange={onOpacityChange}
            onBrushModeChange={onBrushModeChange!}
            onPresetChange={onPresetChange!}
            onStabilizerEnabledChange={onStabilizerEnabledChange!}
            onStabilizerStrengthChange={onStabilizerStrengthChange!}
            onPressureEnabledChange={onPressureEnabledChange!}
            onPressureSensitivityChange={onPressureSensitivityChange!}
            onSmoothingEnabledChange={onSmoothingEnabledChange!}
            onSmoothingStrengthChange={onSmoothingStrengthChange!}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default BrushSettingsPopover;
