import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { ToolButtonProps } from "@/types/tools";

const ToolButton = ({
  icon,
  label,
  shortcut,
  isActive = false,
  hasDropdown = false,
  onClick,
}: ToolButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isActive ? "toolActive" : "tool"}
          size="tool"
          onClick={onClick}
          className="relative flex items-center gap-0.5 cursor-pointer">
          {icon}
          {hasDropdown && (
            <ChevronDown size={12} className="ml-0.5 opacity-60" />
          )}
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
  );
};

export default ToolButton;
