import { KonvaEventObject } from "konva/lib/Node";

export type Tool = 'select' | 'pen' | 'brush' | 'eraser' | 'rectangle' | 'ellipse' | 'line' | 'text' | 'hand' | 'ai';

// Brush modes for drawing
export type BrushMode = 'basic' | 'natural';

// Natural brush preset names
export type NaturalBrushPreset = 'mangaPencil' | 'gPen' | 'marker';

// Brush settings state
export interface BrushSettings {
  mode: BrushMode;
  naturalPreset: NaturalBrushPreset;
  stabilizer: {
    enabled: boolean;
    strength: number; // 0-1
  };
  pressure: {
    enabled: boolean;
    sensitivity: number; // 0.5-2
  };
  smoothing: {
    enabled: boolean;
    strength: number; // 0-1
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface StrokePoint extends Point {
  pressure?: number;
}

export interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface DrawingElement extends BaseElement {
  type: 'drawing';
  points: number[];
  stroke: string;
  strokeWidth: number;
  tension: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  globalCompositeOperation: GlobalCompositeOperation;

  // Binary stroke data (nuevo sistema de compresión)
  strokeBuffer?: ArrayBuffer | null; // Buffer binario con puntos delta-encoded
  bufferBase64?: string;             // Para serialización JSON (backend)
  pointCount?: number;               // Número de puntos en el buffer
  hasPressure?: boolean;             // Si tiene datos de presión reales
  bounds?: {                         // Bounding box para culling
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  bufferVersion?: number;            // Versión del formato (para migración)
}

export interface ShapeElement extends BaseElement {
  type: 'rectangle' | 'ellipse' | 'line';
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  width: number;
  height: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
}

export type CanvasElement = DrawingElement | ShapeElement | TextElement | ImageElement;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  elements: string[];
}

export interface CanvasState {
  width: number;
  height: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface AiState {
  isSelecting: boolean;
  selectionPoints: number[];
  cursorPosition: Point | null;
  isProcessing: boolean;
}

export interface HistoryState {
  past: EditorState[];
  future: EditorState[];
}

export interface LayersPanelState {
  isOpen: boolean;
  position: {
    x: number;
    y: number;
  };
  isCollapsed: boolean;
}

export interface TextEditingState {
  isEditing: boolean;
  elementId: string | null;
  position: Point | null;
}

export interface EditorState {
  tool: Tool;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  fontFamily: string;
  brushSettings: BrushSettings;
  elements: Record<string, CanvasElement>;
  layers: Layer[];
  activeLayerId: string | null;
  selectedElementIds: string[];
  canvas: CanvasState;
  isDrawing: boolean;
  shapeStart: Point | null;
  currentShapeId: string | null;
  textEditing: TextEditingState;
  ai: AiState;
  history: HistoryState;
  layersPanel: LayersPanelState;
}

export interface StageProps {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
  draggable: boolean;
  onMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onWheel: (e: KonvaEventObject<WheelEvent>) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onTouchStart: (e: KonvaEventObject<TouchEvent>) => void;
  onTouchMove: (e: KonvaEventObject<TouchEvent>) => void;
  onTouchEnd: () => void;
}
