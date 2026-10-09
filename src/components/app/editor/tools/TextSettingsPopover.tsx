import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Type, Palette } from "lucide-react";

interface TextSettingsPopoverProps {
  fontSize: number;
  fontFamily: string;
  color: string;
  isActive: boolean;
  onFontSizeChange: (size: number) => void;
  onFontFamilyChange: (family: string) => void;
  onColorChange: (color: string) => void;
  onClick: () => void;
}

const FONT_FAMILIES = [
  { value: "Arial", label: "Arial" },
  { value: "Helvetica", label: "Helvetica" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Verdana", label: "Verdana" },
  { value: "Courier New", label: "Courier New" },
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Impact", label: "Impact" },
];

const PRESET_COLORS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
];

const TextSettingsPopover = ({
  fontSize,
  fontFamily,
  color,
  isActive,
  onFontSizeChange,
  onFontFamilyChange,
  onColorChange,
  onClick,
}: TextSettingsPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isActive ? "toolActive" : "tool"}
                size="tool"
                onClick={(e) => {
                  e.preventDefault();
                  onClick();
                }}
                className="rounded-r-none border-r-0"
              >
                <Type size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Texto (T)</p>
            </TooltipContent>
          </Tooltip>
          <Button
            variant={isActive ? "toolActive" : "tool"}
            size="tool"
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(!isOpen);
            }}
            className="rounded-l-none px-1"
          >
            <ChevronDown size={14} />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 bg-zinc-900 border-zinc-700 p-4"
      >
        <div className="space-y-4">
          {/* Title */}
          <div className="flex items-center gap-2 text-white font-medium">
            <Type size={16} />
            <span>Configuración de texto</span>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs">Fuente</Label>
            <div className="grid grid-cols-2 gap-1">
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.value}
                  onClick={() => onFontFamilyChange(font.value)}
                  className={`px-2 py-1.5 text-xs rounded transition-colors text-left truncate ${
                    fontFamily === font.value
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-400 text-xs">Tamaño</Label>
              <span className="text-white text-xs font-mono bg-zinc-800 px-2 py-0.5 rounded">
                {fontSize}px
              </span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={([value]) => onFontSizeChange(value)}
              min={8}
              max={128}
              step={1}
              className="w-full"
            />
            {/* Quick size buttons */}
            <div className="flex gap-1 flex-wrap">
              {[12, 16, 24, 32, 48, 72].map((size) => (
                <button
                  key={size}
                  onClick={() => onFontSizeChange(size)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    fontSize === size
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette size={12} className="text-zinc-400" />
              <Label className="text-zinc-400 text-xs">Color</Label>
            </div>
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => onColorChange(presetColor)}
                  className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                    color === presetColor
                      ? "border-indigo-500 scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
              {/* Custom color picker */}
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border border-zinc-600"
                title="Color personalizado"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="border border-zinc-700 rounded-lg p-3 bg-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Vista previa:</p>
            <p
              className="truncate"
              style={{
                fontFamily,
                fontSize: Math.min(fontSize, 32),
                color,
              }}
            >
              Texto de ejemplo
            </p>
          </div>

          {/* Usage hint */}
          <p className="text-xs text-zinc-500 italic">
            Haz clic en el canvas para agregar texto
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TextSettingsPopover;
