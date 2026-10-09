import { ShapeOption, ShapeToolPopoverProps } from "@/types/tools";
import { Circle, Minus, Square, ChevronDown } from "lucide-react";
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

const shapeOptions: ShapeOption[] = [
  {
    type: "rectangle",
    icon: <Square size={20} />,
    label: "Rectangulo",
    shortcut: "R",
  },
  {
    type: "ellipse",
    icon: <Circle size={20} />,
    label: "Elipse",
    shortcut: "O",
  },
  { type: "line", icon: <Minus size={20} />, label: "Linea", shortcut: "L" },
];

const ShapeToolPopover = ({
  currentTool,
  selectedShape,
  onShapeSelect,
}: ShapeToolPopoverProps) => {
  const isActive =
    currentTool === "rectangle" ||
    currentTool === "ellipse" ||
    currentTool === "line";
  const currentShape =
    shapeOptions.find((s) => s.type === selectedShape) || shapeOptions[0];

  return (
    <div className="flex items-center">
      {/* Tool button - selects the current shape tool */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "toolActive" : "tool"}
            size="tool"
            onClick={() => onShapeSelect(selectedShape)}
            className="rounded-r-none pr-1 cursor-pointer">
            {currentShape.icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {currentShape.label}
            <span className="ml-2 text-neutral-400">
              {currentShape.shortcut}
            </span>
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Dropdown arrow - opens shape selector */}
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
            <p>Seleccionar forma</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="bottom" className="w-48 p-2">
          <div className="space-y-1">
            {shapeOptions.map((shape) => (
              <Button
                key={shape.type}
                variant={selectedShape === shape.type ? "toolActive" : "tool"}
                size="tool"
                onClick={() => onShapeSelect(shape.type)}
                className="w-full justify-start gap-3 px-3">
                {shape.icon}
                <span className="flex-1 text-left">{shape.label}</span>
                <span className="text-xs text-neutral-400">
                  {shape.shortcut}
                </span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ShapeToolPopover;
