"use client";

import { useCallback } from "react";
import { Download, Save, ChevronDown } from "lucide-react";
import { useAppSelector } from "@/lib/store/hooks";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProjectRestorer from "./ProjectRestorer";

import Konva from "konva";

interface ProfileToolbarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

const ProfileToolbar = ({ stageRef }: ProfileToolbarProps) => {
  const { canvas, elements, layers, layersPanel } = useAppSelector((state) => state.editor);

  const handleExportPNG = useCallback(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: "image/png",
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });

    const link = document.createElement("a");
    link.download = `canvas-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  }, [stageRef, canvas.width, canvas.height]);

  const handleExportJPG = useCallback(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;
    const dataURL = stage.toDataURL({
      pixelRatio: 2,
      mimeType: "image/jpeg",
      quality: 0.9,
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    });

    const link = document.createElement("a");
    link.download = `canvas-${Date.now()}.jpg`;
    link.href = dataURL;
    link.click();
  }, [stageRef, canvas.width, canvas.height]);

  const handleSaveProject = useCallback(() => {
    const projectData = {
      version: "1.0",
      canvas: canvas,
      elements: elements,
      layers: layers,
      layersPanel: layersPanel,
      savedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `project-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [canvas, elements, layers, layersPanel]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="tool"
                    size="tool"
                    className="flex items-center gap-1.5 px-3 bg-neutral-800/95 backdrop-blur-sm border border-neutral-700/50 cursor-pointer">
                    <Download size={18} />
                    <span className="text-sm">Exportar</span>
                    <ChevronDown size={14} className="opacity-60" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Exportar canvas</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="bottom" align="end" className="w-48 p-2">
              <div className="space-y-1">
                <Button
                  variant="tool"
                  size="tool"
                  onClick={handleExportPNG}
                  className="w-full justify-start gap-2 px-3 cursor-pointer">
                  <Download size={16} />
                  <span>Exportar PNG</span>
                </Button>
                <Button
                  variant="tool"
                  size="tool"
                  onClick={handleExportJPG}
                  className="w-full justify-start gap-2 px-3 cursor-pointer">
                  <Download size={16} />
                  <span>Exportar JPG</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Save button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="tool"
                size="tool"
                onClick={handleSaveProject}
                className="flex items-center gap-1.5 px-3 bg-neutral-800/95 backdrop-blur-sm border border-neutral-700/50 cursor-pointer">
                <Save size={18} />
                <span className="text-sm">Guardar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Guardar proyecto</p>
            </TooltipContent>
          </Tooltip>

          {/* Restore button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ProjectRestorer />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Restaurar proyecto</p>
            </TooltipContent>
          </Tooltip>

          {/* Profile avatar */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className="relative rounded-full ring-2 ring-neutral-700/50 hover:ring-indigo-500/50 transition-all">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="https://github.com/shadcn.png" alt="Usuario" />
                      <AvatarFallback>US</AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-800" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Mi perfil</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent side="bottom" align="end" className="w-64 p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="https://github.com/shadcn.png" alt="Usuario" />
                    <AvatarFallback>US</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-neutral-100">Usuario</p>
                    <p className="text-sm text-neutral-400">usuario@email.com</p>
                  </div>
                </div>
                <div className="border-t border-neutral-700 pt-3 space-y-1">
                  <Button
                    variant="tool"
                    size="tool"
                    className="w-full justify-start px-3">
                    <span>Mi cuenta</span>
                  </Button>
                  <Button
                    variant="tool"
                    size="tool"
                    className="w-full justify-start px-3">
                    <span>Configuraciones</span>
                  </Button>
                  <Button
                    variant="tool"
                    size="tool"
                    className="w-full justify-start px-3 text-red-400 hover:text-red-300">
                    <span>Cerrar sesion</span>
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProfileToolbar;
