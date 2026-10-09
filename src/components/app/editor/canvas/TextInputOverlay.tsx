import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  updateTextContent,
  finishTextEditing,
} from "@/lib/store/slices/editorSlice";
import { TextElement } from "@/types/editor";
import { Check, X } from "lucide-react";

interface TextInputOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const TextInputOverlay = ({ containerRef }: TextInputOverlayProps) => {
  const dispatch = useAppDispatch();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { textEditing, elements, canvas, fontSize, fontFamily, strokeColor } =
    useAppSelector((state) => state.editor);

  const currentElement = textEditing.elementId
    ? (elements[textEditing.elementId] as TextElement | undefined)
    : null;

  // Focus textarea when editing starts
  useEffect(() => {
    if (textEditing.isEditing && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [textEditing.isEditing, textEditing.elementId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 30) + "px";
    }
  }, [currentElement?.text]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (textEditing.elementId) {
        dispatch(
          updateTextContent({
            id: textEditing.elementId,
            text: e.target.value,
          })
        );
      }
    },
    [dispatch, textEditing.elementId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation();

      if (e.key === "Escape") {
        dispatch(finishTextEditing());
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        dispatch(finishTextEditing());
      }
    },
    [dispatch]
  );

  const handleConfirm = useCallback(() => {
    dispatch(finishTextEditing());
  }, [dispatch]);

  const handleCancel = useCallback(() => {
    if (textEditing.elementId) {
      dispatch(updateTextContent({ id: textEditing.elementId, text: "" }));
    }
    dispatch(finishTextEditing());
  }, [dispatch, textEditing.elementId]);

  if (!textEditing.isEditing || !textEditing.position || !containerRef.current) {
    return null;
  }

  // Calculate position in screen coordinates
  const screenX = textEditing.position.x * canvas.zoom + canvas.offsetX;
  const screenY = textEditing.position.y * canvas.zoom + canvas.offsetY;

  // Get font properties from current element or defaults
  const currentFontSize = currentElement?.fontSize || fontSize;
  const currentFontFamily = currentElement?.fontFamily || fontFamily;
  const currentColor = currentElement?.fill || strokeColor;

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: screenX,
        top: screenY,
        zIndex: 1000,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Simple inline toolbar */}
      <div className="absolute -top-8 left-0 flex items-center gap-1 bg-zinc-900/95 backdrop-blur-sm rounded px-1 py-0.5 border border-zinc-700 shadow-lg">
        <span className="text-[10px] text-zinc-400 px-1">
          {currentFontFamily} {currentFontSize}px
        </span>
        <div className="w-px h-4 bg-zinc-700" />
        <button
          onClick={handleConfirm}
          className="p-1 rounded hover:bg-green-600/20 text-green-400 transition-colors"
          title="Confirmar (Ctrl+Enter)"
        >
          <Check size={12} />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:bg-red-600/20 text-red-400 transition-colors"
          title="Cancelar (Esc)"
        >
          <X size={12} />
        </button>
      </div>

      {/* Text Input */}
      <textarea
        ref={textareaRef}
        value={currentElement?.text || ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Escribe..."
        className="bg-transparent border-2 border-indigo-500/70 rounded outline-none resize-none px-1"
        style={{
          fontSize: currentFontSize * canvas.zoom,
          fontFamily: currentFontFamily,
          color: currentColor,
          minWidth: 100,
          minHeight: currentFontSize * canvas.zoom + 8,
          lineHeight: 1.3,
          caretColor: currentColor,
        }}
        autoFocus
      />
    </div>
  );
};

export default TextInputOverlay;
