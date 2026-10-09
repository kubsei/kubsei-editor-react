"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileJson, Check, AlertCircle, X } from "lucide-react";
import { useAppDispatch } from "@/lib/store/hooks";
import { restoreProject } from "@/lib/store/slices/editorSlice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProjectData {
  version: string;
  canvas: {
    width: number;
    height: number;
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
  elements: Record<string, unknown>;
  layers: {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    opacity: number;
    elements: string[];
  }[];
  layersPanel?: {
    isOpen: boolean;
    position: {
      x: number;
      y: number;
    };
    isCollapsed: boolean;
  };
  savedAt: string;
}

type RestoreStatus = "idle" | "success" | "error";

const ProjectRestorer = () => {
  const dispatch = useAppDispatch();
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<RestoreStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateProjectData = (data: unknown): data is ProjectData => {
    if (!data || typeof data !== "object") return false;
    const project = data as Partial<ProjectData>;

    if (!project.canvas || typeof project.canvas !== "object") return false;
    if (typeof project.canvas.width !== "number") return false;
    if (typeof project.canvas.height !== "number") return false;

    if (!project.elements || typeof project.elements !== "object") return false;
    if (!Array.isArray(project.layers)) return false;

    return true;
  };

  const resetState = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
    setFileName("");
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json")) {
        setStatus("error");
        setErrorMessage("El archivo debe ser un .json");
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          if (!validateProjectData(data)) {
            setStatus("error");
            setErrorMessage("El archivo no tiene el formato de proyecto valido");
            return;
          }

          dispatch(
            restoreProject({
              canvas: data.canvas,
              elements: data.elements as Record<string, import("@/types/editor").CanvasElement>,
              layers: data.layers,
              layersPanel: data.layersPanel,
            })
          );

          setStatus("success");
          setTimeout(() => {
            setIsOpen(false);
            resetState();
          }, 1500);
        } catch {
          setStatus("error");
          setErrorMessage("Error al parsear el archivo JSON");
        }
      };

      reader.onerror = () => {
        setStatus("error");
        setErrorMessage("Error al leer el archivo");
      };

      reader.readAsText(file);
    },
    [dispatch, resetState]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  }, [resetState]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="tool"
          size="tool"
          className="flex items-center gap-1.5 px-3 bg-neutral-800/95 backdrop-blur-sm border border-neutral-700/50"
        >
          <Upload size={18} />
          <span className="text-sm">Restaurar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restaurar Proyecto</DialogTitle>
          <DialogDescription>
            Arrastra un archivo .json de proyecto guardado para restaurar tu trabajo.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative mt-4 p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer
            flex flex-col items-center justify-center gap-4 min-h-50
            ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10"
                : status === "success"
                ? "border-green-500 bg-green-500/10"
                : status === "error"
                ? "border-red-500 bg-red-500/10"
                : "border-neutral-600 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileInput}
            className="hidden"
          />

          {status === "idle" && (
            <>
              <div
                className={`
                  p-4 rounded-full transition-colors
                  ${isDragging ? "bg-indigo-500/20" : "bg-neutral-700/50"}
                `}
              >
                <FileJson
                  size={32}
                  className={isDragging ? "text-indigo-400" : "text-neutral-400"}
                />
              </div>
              <div className="text-center">
                <p className="text-neutral-200 font-medium">
                  {isDragging ? "Suelta el archivo aqui" : "Arrastra tu archivo .json"}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  o haz clic para seleccionar
                </p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="p-4 rounded-full bg-green-500/20">
                <Check size={32} className="text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-green-400 font-medium">Proyecto restaurado</p>
                <p className="text-sm text-neutral-400 mt-1">{fileName}</p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="p-4 rounded-full bg-red-500/20">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-sm text-neutral-400 mt-1">{errorMessage}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetState();
                }}
                className="mt-2"
              >
                <X size={14} className="mr-1" />
                Intentar de nuevo
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectRestorer;
