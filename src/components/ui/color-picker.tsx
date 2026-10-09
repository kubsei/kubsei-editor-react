"use client";

import * as React from "react";
import { useCallback, useState, useRef, useEffect } from "react";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
  recentColors?: string[];
  onRecentColorsChange?: (colors: string[]) => void;
}

const PRESET_COLORS = [
  // Row 1 - Grays
  "#000000", "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080", "#999999", "#b3b3b3", "#cccccc", "#ffffff",
  // Row 2 - Reds to Yellows
  "#ff0000", "#ff3333", "#ff6666", "#ff9999", "#ffcccc", "#ff6600", "#ff9933", "#ffcc66", "#ffff00", "#ffff66",
  // Row 3 - Greens
  "#00ff00", "#33ff33", "#66ff66", "#99ff99", "#ccffcc", "#00cc00", "#009900", "#006600", "#003300", "#00ff99",
  // Row 4 - Blues
  "#0000ff", "#3333ff", "#6666ff", "#9999ff", "#ccccff", "#0066ff", "#0099ff", "#00ccff", "#00ffff", "#66ffff",
  // Row 5 - Purples & Pinks
  "#9900ff", "#cc33ff", "#ff00ff", "#ff66ff", "#ff99ff", "#cc0099", "#990066", "#660033", "#ff0066", "#ff3399",
];

// Convert HSV to RGB
const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
};

// Convert RGB to HSV
const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return [h, s, v];
};

// Convert hex to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

// Convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
};

export const ColorPicker = ({
  color,
  onChange,
  className,
  recentColors = [],
  onRecentColorsChange,
}: ColorPickerProps) => {
  const [hsv, setHsv] = useState<[number, number, number]>(() => {
    const rgb = hexToRgb(color);
    return rgbToHsv(...rgb);
  });
  const [hexInput, setHexInput] = useState(color);
  const [activeTab, setActiveTab] = useState<"picker" | "swatches">("picker");
  const [prevColor, setPrevColor] = useState(color);

  // Sync state when color prop changes (React recommended pattern)
  if (color !== prevColor) {
    setPrevColor(color);
    const newRgb = hexToRgb(color);
    setHsv(rgbToHsv(...newRgb));
    setHexInput(color);
  }

  // Check for EyeDropper support (lazy initialization to avoid SSR issues)
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const satValRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);
  const isDraggingHue = useRef(false);

  const updateColor = useCallback((h: number, s: number, v: number, addToRecent = true) => {
    const newRgb = hsvToRgb(h, s, v);
    const hex = rgbToHex(...newRgb);
    setHsv([h, s, v]);
    setHexInput(hex);
    onChange(hex);

    if (addToRecent && onRecentColorsChange) {
      const newRecent = [hex, ...recentColors.filter(c => c !== hex)].slice(0, 7);
      onRecentColorsChange(newRecent);
    }
  }, [onChange, recentColors, onRecentColorsChange]);

  const handleSatValMouseDown = (e: React.MouseEvent) => {
    isDraggingSatVal.current = true;
    handleSatValMove(e);
  };

  const handleSatValMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    updateColor(hsv[0], x, 1 - y, false);
  }, [hsv, updateColor]);

  const handleHueMouseDown = (e: React.MouseEvent) => {
    isDraggingHue.current = true;
    handleHueMove(e);
  };

  const handleHueMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateColor(x * 360, hsv[1], hsv[2], false);
  }, [hsv, updateColor]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSatVal.current) handleSatValMove(e);
      if (isDraggingHue.current) handleHueMove(e);
    };
    const handleMouseUp = () => {
      if (isDraggingSatVal.current || isDraggingHue.current) {
        // Add to recent on mouse up
        if (onRecentColorsChange) {
          const hex = rgbToHex(...hsvToRgb(hsv[0], hsv[1], hsv[2]));
          const newRecent = [hex, ...recentColors.filter(c => c !== hex)].slice(0, 7);
          onRecentColorsChange(newRecent);
        }
      }
      isDraggingSatVal.current = false;
      isDraggingHue.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleSatValMove, handleHueMove, hsv, recentColors, onRecentColorsChange]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (!value.startsWith("#")) {
      value = "#" + value;
    }
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const newRgb = hexToRgb(value);
      const newHsv = rgbToHsv(...newRgb);
      setHsv(newHsv);
      onChange(value);
    }
  };

  const handlePresetClick = (presetColor: string) => {
    const newRgb = hexToRgb(presetColor);
    const newHsv = rgbToHsv(...newRgb);
    setHsv(newHsv);
    setHexInput(presetColor);
    onChange(presetColor);

    if (onRecentColorsChange) {
      const newRecent = [presetColor, ...recentColors.filter(c => c !== presetColor)].slice(0, 7);
      onRecentColorsChange(newRecent);
    }
  };

  const handleEyeDropper = async () => {
    if (!("EyeDropper" in window)) {
      return;
    }

    try {
      // @ts-expect-error EyeDropper is not yet in TypeScript
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const pickedColor = result.sRGBHex;

      const newRgb = hexToRgb(pickedColor);
      const newHsv = rgbToHsv(...newRgb);
      setHsv(newHsv);
      setHexInput(pickedColor);
      onChange(pickedColor);

      if (onRecentColorsChange) {
        const newRecent = [pickedColor, ...recentColors.filter(c => c !== pickedColor)].slice(0, 7);
        onRecentColorsChange(newRecent);
      }
    } catch {
      // User cancelled
    }
  };

  const hueColor = rgbToHex(...hsvToRgb(hsv[0], 1, 1));
  const currentColor = rgbToHex(...hsvToRgb(hsv[0], hsv[1], hsv[2]));

  return (
    <div className={cn("w-72 bg-neutral-900 rounded-xl overflow-hidden", className)}>
      {/* Tabs */}
      <div className="flex border-b border-neutral-700">
        <button
          onClick={() => setActiveTab("picker")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium transition-colors",
            activeTab === "picker"
              ? "text-white bg-neutral-800"
              : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          Selector
        </button>
        <button
          onClick={() => setActiveTab("swatches")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium transition-colors",
            activeTab === "swatches"
              ? "text-white bg-neutral-800"
              : "text-neutral-400 hover:text-neutral-200"
          )}
        >
          Paleta
        </button>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "picker" ? (
          <>
            {/* Saturation/Value picker */}
            <div
              ref={satValRef}
              className="relative w-full h-44 rounded-lg cursor-crosshair overflow-hidden ring-1 ring-neutral-700"
              style={{ backgroundColor: hueColor }}
              onMouseDown={handleSatValMouseDown}
            >
              <div className="absolute inset-0 bg-linear-to-r from-white to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-black to-transparent" />
              <div
                className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  left: `${hsv[1] * 100}%`,
                  top: `${(1 - hsv[2]) * 100}%`,
                  backgroundColor: currentColor,
                  boxShadow: "0 0 0 2px white, 0 0 0 3px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)",
                }}
              />
            </div>

            {/* Hue slider */}
            <div
              ref={hueRef}
              className="relative w-full h-4 rounded-full cursor-pointer ring-1 ring-neutral-700"
              style={{
                background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
              }}
              onMouseDown={handleHueMouseDown}
            >
              <div
                className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 top-1/2 rounded-full pointer-events-none"
                style={{
                  left: `${(hsv[0] / 360) * 100}%`,
                  backgroundColor: hueColor,
                  boxShadow: "0 0 0 2px white, 0 0 0 3px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)",
                }}
              />
            </div>

            {/* Color preview and controls */}
            <div className="flex items-center gap-3">
              {/* Color preview with checkerboard for transparency */}
              <div className="relative w-12 h-12 rounded-lg overflow-hidden ring-1 ring-neutral-700">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #3a3a3a 25%, transparent 25%),
                      linear-gradient(-45deg, #3a3a3a 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #3a3a3a 75%),
                      linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)
                    `,
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: currentColor }}
                />
              </div>

              {/* Hex input */}
              <div className="flex-1">
                <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded-lg ring-1 ring-neutral-700 focus-within:ring-indigo-500">
                  <span className="text-neutral-500 text-sm font-mono">#</span>
                  <input
                    type="text"
                    value={hexInput.replace("#", "")}
                    onChange={handleHexChange}
                    maxLength={6}
                    className="flex-1 bg-transparent text-sm font-mono text-neutral-100 focus:outline-none uppercase"
                    placeholder="000000"
                  />
                </div>
              </div>

              {/* Eyedropper button */}
              {hasEyeDropper && (
                <button
                  onClick={handleEyeDropper}
                  className="p-2.5 bg-neutral-800 rounded-lg ring-1 ring-neutral-700 hover:bg-neutral-700 transition-colors"
                  title="Seleccionar color de pantalla"
                >
                  <Pipette size={18} className="text-neutral-300" />
                </button>
              )}
            </div>

            {/* Recent colors */}
            {recentColors.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs text-neutral-500 uppercase tracking-wide">Recientes</span>
                <div className="flex gap-1.5 flex-wrap">
                  {recentColors.map((recentColor, index) => (
                    <button
                      key={`${recentColor}-${index}`}
                      className={cn(
                        "w-7 h-7 rounded-md ring-1 ring-neutral-700 transition-all hover:scale-110 hover:ring-2 hover:ring-neutral-500",
                        currentColor.toLowerCase() === recentColor.toLowerCase() && "ring-2 ring-white"
                      )}
                      style={{ backgroundColor: recentColor }}
                      onClick={() => handlePresetClick(recentColor)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Swatches grid */
          <div className="grid grid-cols-10 gap-1">
            {PRESET_COLORS.map((presetColor, index) => (
              <button
                key={`${presetColor}-${index}`}
                className={cn(
                  "w-6 h-6 rounded-md ring-1 ring-neutral-700 transition-all hover:scale-110 hover:ring-2 hover:ring-neutral-500",
                  currentColor.toLowerCase() === presetColor.toLowerCase() && "ring-2 ring-white"
                )}
                style={{ backgroundColor: presetColor }}
                onClick={() => handlePresetClick(presetColor)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPicker;
