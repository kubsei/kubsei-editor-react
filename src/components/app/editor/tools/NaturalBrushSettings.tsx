/**
 * NaturalBrushSettings - Panel de configuración avanzada de pincel natural
 *
 * Permite configurar:
 * - Modo: Basic vs Natural
 * - Preset de pincel natural (Manga Pencil, G-Pen, Marker)
 * - Estabilizador
 * - Sensibilidad de presión
 * - Suavizado
 */

"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BrushMode, NaturalBrushPreset, BrushSettings } from "@/types/editor";
import {
  Pencil,
  PenTool,
  Highlighter,
  Crosshair,
  Gauge,
  Waves,
  Sparkles,
  Circle,
} from "lucide-react";

// ============ TYPES ============

interface NaturalBrushSettingsProps {
  brushSettings: BrushSettings;
  strokeWidth: number;
  opacity: number;
  onStrokeWidthChange: (value: number) => void;
  onOpacityChange: (value: number) => void;
  onBrushModeChange: (mode: BrushMode) => void;
  onPresetChange: (preset: NaturalBrushPreset) => void;
  onStabilizerEnabledChange: (enabled: boolean) => void;
  onStabilizerStrengthChange: (strength: number) => void;
  onPressureEnabledChange: (enabled: boolean) => void;
  onPressureSensitivityChange: (sensitivity: number) => void;
  onSmoothingEnabledChange: (enabled: boolean) => void;
  onSmoothingStrengthChange: (strength: number) => void;
}

// ============ PRESET DATA ============

const PRESET_INFO: Record<NaturalBrushPreset, {
  icon: React.ReactNode;
  name: string;
  description: string;
}> = {
  mangaPencil: {
    icon: <Pencil size={18} />,
    name: "Lápiz Manga",
    description: "Lápiz con textura de grano, ideal para bocetos",
  },
  gPen: {
    icon: <PenTool size={18} />,
    name: "G-Pen",
    description: "Pluma limpia para entintado profesional",
  },
  marker: {
    icon: <Highlighter size={18} />,
    name: "Marcador",
    description: "Marcador suave para coloreado",
  },
};

// ============ COMPONENT ============

const NaturalBrushSettings = memo(function NaturalBrushSettings({
  brushSettings,
  strokeWidth,
  opacity,
  onStrokeWidthChange,
  onOpacityChange,
  onBrushModeChange,
  onPresetChange,
  onStabilizerEnabledChange,
  onStabilizerStrengthChange,
  onPressureEnabledChange,
  onPressureSensitivityChange,
  onSmoothingEnabledChange,
  onSmoothingStrengthChange,
}: NaturalBrushSettingsProps) {
  const isNaturalMode = brushSettings.mode === "natural";

  return (
    <div className="w-72 space-y-4">
      {/* Mode Toggle */}
      <div className="space-y-2">
        <Label className="text-xs text-neutral-400 uppercase tracking-wide">
          Modo de Dibujo
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={brushSettings.mode === "basic"}
            onClick={() => onBrushModeChange("basic")}
            icon={<Circle size={16} />}
            label="Básico"
            description="Líneas simples"
          />
          <ModeButton
            active={brushSettings.mode === "natural"}
            onClick={() => onBrushModeChange("natural")}
            icon={<Sparkles size={16} />}
            label="Natural"
            description="Presión y textura"
          />
        </div>
      </div>

      <Separator className="bg-neutral-700" />

      {/* Basic Settings */}
      <div className="space-y-3">
        {/* Stroke Width */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-300">Grosor</span>
            <span className="text-sm text-neutral-400 tabular-nums">
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

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-300">Opacidad</span>
            <span className="text-sm text-neutral-400 tabular-nums">
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

      {/* Natural Mode Settings */}
      {isNaturalMode && (
        <>
          <Separator className="bg-neutral-700" />

          {/* Preset Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-neutral-400 uppercase tracking-wide">
              Tipo de Pincel
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRESET_INFO) as NaturalBrushPreset[]).map((preset) => (
                <PresetButton
                  key={preset}
                  preset={preset}
                  active={brushSettings.naturalPreset === preset}
                  onClick={() => onPresetChange(preset)}
                  info={PRESET_INFO[preset]}
                />
              ))}
            </div>
          </div>

          <Separator className="bg-neutral-700" />

          {/* Advanced Settings */}
          <div className="space-y-4">
            {/* Stabilizer */}
            <SettingRow
              icon={<Crosshair size={16} />}
              label="Estabilizador"
              description="Reduce el temblor de mano"
              enabled={brushSettings.stabilizer.enabled}
              onEnabledChange={onStabilizerEnabledChange}
              value={brushSettings.stabilizer.strength}
              onValueChange={onStabilizerStrengthChange}
              min={0}
              max={1}
              step={0.05}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />

            {/* Pressure */}
            <SettingRow
              icon={<Gauge size={16} />}
              label="Presión"
              description="Respuesta a la presión del stylus"
              enabled={brushSettings.pressure.enabled}
              onEnabledChange={onPressureEnabledChange}
              value={brushSettings.pressure.sensitivity}
              onValueChange={onPressureSensitivityChange}
              min={0.5}
              max={2}
              step={0.1}
              formatValue={(v) => `${v.toFixed(1)}x`}
            />

            {/* Smoothing */}
            <SettingRow
              icon={<Waves size={16} />}
              label="Suavizado"
              description="Suaviza las curvas del trazo"
              enabled={brushSettings.smoothing.enabled}
              onEnabledChange={onSmoothingEnabledChange}
              value={brushSettings.smoothing.strength}
              onValueChange={onSmoothingStrengthChange}
              min={0}
              max={1}
              step={0.05}
              formatValue={(v) => `${Math.round(v * 100)}%`}
            />
          </div>
        </>
      )}
    </div>
  );
});

// ============ SUB COMPONENTS ============

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function ModeButton({ active, onClick, icon, label, description }: ModeButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
            active
              ? "border-indigo-500 bg-indigo-500/20 text-white"
              : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
          )}
        >
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface PresetButtonProps {
  preset: NaturalBrushPreset;
  active: boolean;
  onClick: () => void;
  info: {
    icon: React.ReactNode;
    name: string;
    description: string;
  };
}

function PresetButton({ active, onClick, info }: PresetButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all",
            active
              ? "border-indigo-500 bg-indigo-500/20 text-white"
              : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
          )}
        >
          {info.icon}
          <span className="text-[10px] font-medium truncate w-full text-center">
            {info.name}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="font-medium">{info.name}</p>
        <p className="text-xs text-neutral-400">{info.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  formatValue: (value: number) => string;
}

function SettingRow({
  icon,
  label,
  description,
  enabled,
  onEnabledChange,
  value,
  onValueChange,
  min,
  max,
  step,
  formatValue,
}: SettingRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-help">
              <span className="text-neutral-400">{icon}</span>
              <span className="text-sm text-neutral-300">{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 tabular-nums w-10 text-right">
            {enabled ? formatValue(value) : "Off"}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            className="scale-75"
          />
        </div>
      </div>
      {enabled && (
        <Slider
          value={[value]}
          onValueChange={(values) => onValueChange(values[0])}
          min={min}
          max={max}
          step={step}
          className="opacity-90"
        />
      )}
    </div>
  );
}

// ============ EXPORTS ============

export default NaturalBrushSettings;
export { NaturalBrushSettings };
