import { Tool, BrushSettings, BrushMode, NaturalBrushPreset } from "./editor";

export interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive?: boolean;
  hasDropdown?: boolean;
  onClick?: () => void;
}

export interface BrushSettingsPopoverProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  isActive: boolean;
  onToolSelect: () => void;
  strokeWidth: number;
  opacity: number;
  onStrokeWidthChange: (value: number) => void;
  onOpacityChange: (value: number) => void;
  // Extended for natural brush
  brushSettings?: BrushSettings;
  onBrushModeChange?: (mode: BrushMode) => void;
  onPresetChange?: (preset: NaturalBrushPreset) => void;
  onStabilizerEnabledChange?: (enabled: boolean) => void;
  onStabilizerStrengthChange?: (strength: number) => void;
  onPressureEnabledChange?: (enabled: boolean) => void;
  onPressureSensitivityChange?: (sensitivity: number) => void;
  onSmoothingEnabledChange?: (enabled: boolean) => void;
  onSmoothingStrengthChange?: (strength: number) => void;
  showNaturalSettings?: boolean;
}

export type ShapeType = "rectangle" | "ellipse" | "line";

export interface ShapeOption {
  type: ShapeType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

export interface ShapeToolPopoverProps {
  currentTool: Tool;
  selectedShape: ShapeType;
  onShapeSelect: (shape: ShapeType) => void;
}
