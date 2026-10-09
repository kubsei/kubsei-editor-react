import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import {
  EditorState,
  Tool,
  CanvasElement,
  DrawingElement,
  ShapeElement,
  ImageElement,
  TextElement,
  Layer,
  Point,
  LayersPanelState,
  BrushMode,
  NaturalBrushPreset,
  BrushSettings,
  TextEditingState,
} from '@/types/editor';

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  past: EditorState[];
  future: EditorState[];
}

const createDefaultLayer = (): Layer => ({
  id: uuidv4(),
  name: 'Capa 1',
  visible: true,
  locked: false,
  opacity: 1,
  elements: [],
});

const defaultLayer = createDefaultLayer();

// Default brush settings
const defaultBrushSettings: BrushSettings = {
  mode: 'basic',
  naturalPreset: 'mangaPencil',
  stabilizer: {
    enabled: true,
    strength: 0.3,
  },
  pressure: {
    enabled: true,
    sensitivity: 1.0,
  },
  smoothing: {
    enabled: true,
    strength: 0.5,
  },
};

const initialState: EditorState = {
  tool: 'pen',
  strokeColor: '#000000',
  fillColor: '#ffffff',
  strokeWidth: 4,
  opacity: 1,
  fontSize: 24,
  fontFamily: 'Arial',
  brushSettings: defaultBrushSettings,
  elements: {},
  layers: [defaultLayer],
  activeLayerId: defaultLayer.id,
  selectedElementIds: [],
  canvas: {
    width: 1920,
    height: 1080,
    zoom: 0.5,
    offsetX: 0,
    offsetY: 0,
  },
  isDrawing: false,
  shapeStart: null,
  currentShapeId: null,
  textEditing: {
    isEditing: false,
    elementId: null,
    position: null,
  },
  ai: {
    isSelecting: false,
    selectionPoints: [],
    cursorPosition: null,
    isProcessing: false,
  },
  history: {
    past: [],
    future: [],
  },
  layersPanel: {
    isOpen: true,
    position: { x: 16, y: 80 },
    isCollapsed: false,
  },
};

// Helper to save state to history
const saveToHistory = (state: EditorState) => {
  const stateToSave = {
    ...state,
    history: { past: [], future: [] }, // Don't include history in saved states
  };
  state.history.past.push(JSON.parse(JSON.stringify(stateToSave)));
  if (state.history.past.length > MAX_HISTORY_SIZE) {
    state.history.past.shift();
  }
  state.history.future = [];
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    // Tool actions
    setTool: (state, action: PayloadAction<Tool>) => {
      state.tool = action.payload;
      state.selectedElementIds = [];
    },

    // Color actions
    setStrokeColor: (state, action: PayloadAction<string>) => {
      state.strokeColor = action.payload;
    },
    setFillColor: (state, action: PayloadAction<string>) => {
      state.fillColor = action.payload;
    },
    setStrokeWidth: (state, action: PayloadAction<number>) => {
      state.strokeWidth = action.payload;
    },
    setOpacity: (state, action: PayloadAction<number>) => {
      state.opacity = action.payload;
    },

    // Brush settings actions
    setBrushMode: (state, action: PayloadAction<BrushMode>) => {
      state.brushSettings.mode = action.payload;
    },
    setNaturalBrushPreset: (state, action: PayloadAction<NaturalBrushPreset>) => {
      state.brushSettings.naturalPreset = action.payload;
    },
    setStabilizerEnabled: (state, action: PayloadAction<boolean>) => {
      state.brushSettings.stabilizer.enabled = action.payload;
    },
    setStabilizerStrength: (state, action: PayloadAction<number>) => {
      state.brushSettings.stabilizer.strength = Math.max(0, Math.min(1, action.payload));
    },
    setPressureEnabled: (state, action: PayloadAction<boolean>) => {
      state.brushSettings.pressure.enabled = action.payload;
    },
    setPressureSensitivity: (state, action: PayloadAction<number>) => {
      state.brushSettings.pressure.sensitivity = Math.max(0.5, Math.min(2, action.payload));
    },
    setSmoothingEnabled: (state, action: PayloadAction<boolean>) => {
      state.brushSettings.smoothing.enabled = action.payload;
    },
    setSmoothingStrength: (state, action: PayloadAction<number>) => {
      state.brushSettings.smoothing.strength = Math.max(0, Math.min(1, action.payload));
    },
    updateBrushSettings: (state, action: PayloadAction<Partial<BrushSettings>>) => {
      state.brushSettings = { ...state.brushSettings, ...action.payload };
    },

    // Drawing actions
    setIsDrawing: (state, action: PayloadAction<boolean>) => {
      state.isDrawing = action.payload;
    },

    startDrawing: (state, action: PayloadAction<Point>) => {
      const { x, y } = action.payload;
      const id = uuidv4();

      saveToHistory(state);

      const newElement: DrawingElement = {
        id,
        type: 'drawing',
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: state.opacity,
        visible: true,
        locked: false,
        points: [x, y],
        stroke: state.tool === 'eraser' ? '#ffffff' : state.strokeColor,
        strokeWidth: state.strokeWidth,
        tension: 0.5,
        lineCap: 'round',
        lineJoin: 'round',
        globalCompositeOperation: state.tool === 'eraser' ? 'destination-out' : 'source-over',
      };

      state.elements[id] = newElement;
      state.isDrawing = true;

      // Add to active layer
      if (state.activeLayerId) {
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (layer) {
          layer.elements.push(id);
        }
      }
    },

    continueDrawing: (state, action: PayloadAction<Point>) => {
      if (!state.isDrawing) return;

      const { x, y } = action.payload;
      const activeLayer = state.layers.find(l => l.id === state.activeLayerId);

      if (activeLayer && activeLayer.elements.length > 0) {
        const lastElementId = activeLayer.elements[activeLayer.elements.length - 1];
        const element = state.elements[lastElementId];

        if (element && element.type === 'drawing') {
          (element as DrawingElement).points.push(x, y);
        }
      }
    },

    endDrawing: (state) => {
      state.isDrawing = false;
    },

    // Binary stroke actions (nuevo sistema de compresión)
    /**
     * Finaliza un stroke y almacena los datos binarios
     * Se llama después de que el Worker procese el stroke
     */
    finalizeStrokeWithBuffer: (state, action: PayloadAction<{
      elementId: string;
      bufferBase64: string;
      pointCount: number;
      hasPressure: boolean;
      bounds: { minX: number; minY: number; maxX: number; maxY: number };
      bufferVersion: number;
    }>) => {
      const { elementId, bufferBase64, pointCount, hasPressure, bounds, bufferVersion } = action.payload;
      const element = state.elements[elementId];

      if (element && element.type === 'drawing') {
        const drawingElement = element as DrawingElement;
        // Almacenar datos binarios (base64 para serialización)
        drawingElement.bufferBase64 = bufferBase64;
        drawingElement.pointCount = pointCount;
        drawingElement.hasPressure = hasPressure;
        drawingElement.bounds = bounds;
        drawingElement.bufferVersion = bufferVersion;
        // Limpiar puntos temporales si existen en el array
        // Los puntos ahora se reconstruyen desde el buffer
      }

      state.isDrawing = false;
    },

    /**
     * Inicia un stroke para captura de puntos crudos
     * Compatible con el nuevo sistema de captura
     */
    startStrokeCapture: (state, action: PayloadAction<{
      id: string;
      layerId: string;
      stroke: string;
      strokeWidth: number;
      opacity: number;
      tension: number;
      lineCap: 'butt' | 'round' | 'square';
      lineJoin: 'miter' | 'round' | 'bevel';
      globalCompositeOperation: GlobalCompositeOperation;
      initialPoint: { x: number; y: number };
    }>) => {
      const payload = action.payload;
      saveToHistory(state);

      const newElement: DrawingElement = {
        id: payload.id,
        type: 'drawing',
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: payload.opacity,
        visible: true,
        locked: false,
        points: [payload.initialPoint.x, payload.initialPoint.y],
        stroke: payload.stroke,
        strokeWidth: payload.strokeWidth,
        tension: payload.tension,
        lineCap: payload.lineCap,
        lineJoin: payload.lineJoin,
        globalCompositeOperation: payload.globalCompositeOperation,
      };

      state.elements[payload.id] = newElement;
      state.isDrawing = true;

      // Add to specified layer
      const layer = state.layers.find(l => l.id === payload.layerId);
      if (layer) {
        layer.elements.push(payload.id);
      }
    },

    /**
     * Actualiza puntos durante el dibujo (para preview en tiempo real)
     */
    updateStrokePoints: (state, action: PayloadAction<{
      elementId: string;
      points: number[];
    }>) => {
      const { elementId, points } = action.payload;
      const element = state.elements[elementId];

      if (element && element.type === 'drawing') {
        (element as DrawingElement).points = points;
      }
    },

    // Shape actions
    startShape: (state, action: PayloadAction<{ point: Point; shapeType: 'rectangle' | 'ellipse' | 'line' }>) => {
      const { point, shapeType } = action.payload;
      const id = uuidv4();

      saveToHistory(state);

      const newShape: ShapeElement = {
        id,
        type: shapeType,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: state.opacity,
        visible: true,
        locked: false,
        fill: state.fillColor,
        stroke: state.strokeColor,
        strokeWidth: state.strokeWidth,
      };

      state.elements[id] = newShape;
      state.shapeStart = point;
      state.currentShapeId = id;
      state.isDrawing = true;

      if (state.activeLayerId) {
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (layer) {
          layer.elements.push(id);
        }
      }
    },

    updateShape: (state, action: PayloadAction<Point>) => {
      if (!state.currentShapeId || !state.shapeStart) return;

      const { x, y } = action.payload;
      const element = state.elements[state.currentShapeId] as ShapeElement;

      if (element) {
        const startX = state.shapeStart.x;
        const startY = state.shapeStart.y;

        // Calculate dimensions
        const width = x - startX;
        const height = y - startY;

        // Handle negative dimensions
        element.x = width < 0 ? x : startX;
        element.y = height < 0 ? y : startY;
        element.width = Math.abs(width);
        element.height = Math.abs(height);
      }
    },

    endShape: (state) => {
      state.isDrawing = false;
      state.shapeStart = null;
      state.currentShapeId = null;
    },

    // Element actions
    addElement: (state, action: PayloadAction<CanvasElement>) => {
      saveToHistory(state);
      const element = action.payload;
      state.elements[element.id] = element;

      if (state.activeLayerId) {
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (layer) {
          layer.elements.push(element.id);
        }
      }
    },

    addImage: (state, action: PayloadAction<{ src: string; width: number; height: number }>) => {
      saveToHistory(state);
      const { src, width, height } = action.payload;
      const id = uuidv4();

      // Center the image on the canvas
      const x = (state.canvas.width - width) / 2;
      const y = (state.canvas.height - height) / 2;

      const imageElement: ImageElement = {
        id,
        type: 'image',
        x,
        y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        src,
        width,
        height,
      };

      state.elements[id] = imageElement;

      if (state.activeLayerId) {
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (layer) {
          layer.elements.push(id);
        }
      }

      state.selectedElementIds = [id];
    },

    // Text actions
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload;
    },

    setFontFamily: (state, action: PayloadAction<string>) => {
      state.fontFamily = action.payload;
    },

    startTextEditing: (state, action: PayloadAction<Point>) => {
      const { x, y } = action.payload;
      const id = uuidv4();

      saveToHistory(state);

      const newTextElement: TextElement = {
        id,
        type: 'text',
        x,
        y,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: state.opacity,
        visible: true,
        locked: false,
        text: '',
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
        fill: state.strokeColor,
        width: 200,
        height: state.fontSize * 1.5,
      };

      state.elements[id] = newTextElement;

      if (state.activeLayerId) {
        const layer = state.layers.find(l => l.id === state.activeLayerId);
        if (layer) {
          layer.elements.push(id);
        }
      }

      state.textEditing = {
        isEditing: true,
        elementId: id,
        position: { x, y },
      };
    },

    updateTextContent: (state, action: PayloadAction<{ id: string; text: string }>) => {
      const { id, text } = action.payload;
      const element = state.elements[id];
      if (element && element.type === 'text') {
        (element as TextElement).text = text;
      }
    },

    finishTextEditing: (state) => {
      // If the text is empty, remove the element
      if (state.textEditing.elementId) {
        const element = state.elements[state.textEditing.elementId];
        if (element && element.type === 'text' && !(element as TextElement).text.trim()) {
          delete state.elements[state.textEditing.elementId];
          state.layers.forEach(layer => {
            layer.elements = layer.elements.filter(elId => elId !== state.textEditing.elementId);
          });
        }
      }

      state.textEditing = {
        isEditing: false,
        elementId: null,
        position: null,
      };
    },

    editExistingText: (state, action: PayloadAction<string>) => {
      const elementId = action.payload;
      const element = state.elements[elementId];
      if (element && element.type === 'text') {
        state.textEditing = {
          isEditing: true,
          elementId,
          position: { x: element.x, y: element.y },
        };
      }
    },

    updateElement: (state, action: PayloadAction<{ id: string; updates: Partial<CanvasElement> }>) => {
      const { id, updates } = action.payload;
      if (state.elements[id]) {
        state.elements[id] = { ...state.elements[id], ...updates } as CanvasElement;
      }
    },

    deleteElement: (state, action: PayloadAction<string>) => {
      saveToHistory(state);
      const id = action.payload;
      delete state.elements[id];

      state.layers.forEach(layer => {
        layer.elements = layer.elements.filter(elId => elId !== id);
      });

      state.selectedElementIds = state.selectedElementIds.filter(elId => elId !== id);
    },

    deleteSelectedElements: (state) => {
      if (state.selectedElementIds.length === 0) return;
      saveToHistory(state);
      state.selectedElementIds.forEach(id => {
        delete state.elements[id];
        state.layers.forEach(layer => {
          layer.elements = layer.elements.filter(elId => elId !== id);
        });
      });
      state.selectedElementIds = [];
    },

    // Selection actions
    selectElement: (state, action: PayloadAction<string>) => {
      state.selectedElementIds = [action.payload];
    },

    addToSelection: (state, action: PayloadAction<string>) => {
      if (!state.selectedElementIds.includes(action.payload)) {
        state.selectedElementIds.push(action.payload);
      }
    },

    clearSelection: (state) => {
      state.selectedElementIds = [];
    },

    // Layer actions
    addLayer: (state) => {
      saveToHistory(state);
      const newLayer: Layer = {
        id: uuidv4(),
        name: `Capa ${state.layers.length + 1}`,
        visible: true,
        locked: false,
        opacity: 1,
        elements: [],
      };
      state.layers.push(newLayer);
      state.activeLayerId = newLayer.id;
    },

    setActiveLayer: (state, action: PayloadAction<string>) => {
      state.activeLayerId = action.payload;
    },

    toggleLayerVisibility: (state, action: PayloadAction<string>) => {
      const layer = state.layers.find(l => l.id === action.payload);
      if (layer) {
        layer.visible = !layer.visible;
      }
    },

    toggleLayerLock: (state, action: PayloadAction<string>) => {
      const layer = state.layers.find(l => l.id === action.payload);
      if (layer) {
        layer.locked = !layer.locked;
      }
    },

    setLayerOpacity: (state, action: PayloadAction<{ id: string; opacity: number }>) => {
      const layer = state.layers.find(l => l.id === action.payload.id);
      if (layer) {
        layer.opacity = action.payload.opacity;
      }
    },

    renameLayer: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const layer = state.layers.find(l => l.id === action.payload.id);
      if (layer) {
        layer.name = action.payload.name;
      }
    },

    deleteLayer: (state, action: PayloadAction<string>) => {
      if (state.layers.length <= 1) return; // Don't delete last layer
      saveToHistory(state);

      const layerIndex = state.layers.findIndex(l => l.id === action.payload);
      if (layerIndex === -1) return;

      const layer = state.layers[layerIndex];

      // Delete all elements in this layer
      layer.elements.forEach(elementId => {
        delete state.elements[elementId];
      });

      // Remove layer
      state.layers.splice(layerIndex, 1);

      // Update active layer if needed
      if (state.activeLayerId === action.payload) {
        state.activeLayerId = state.layers[0]?.id || null;
      }

      // Clear selection
      state.selectedElementIds = [];
    },

    reorderLayers: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      saveToHistory(state);
      const { fromIndex, toIndex } = action.payload;
      const [removed] = state.layers.splice(fromIndex, 1);
      state.layers.splice(toIndex, 0, removed);
    },

    duplicateLayer: (state, action: PayloadAction<string>) => {
      saveToHistory(state);
      const sourceLayer = state.layers.find(l => l.id === action.payload);
      if (!sourceLayer) return;

      const newLayerId = uuidv4();
      const elementIdMap: Record<string, string> = {};

      // Duplicate elements
      sourceLayer.elements.forEach(elementId => {
        const element = state.elements[elementId];
        if (element) {
          const newElementId = uuidv4();
          elementIdMap[elementId] = newElementId;
          state.elements[newElementId] = {
            ...JSON.parse(JSON.stringify(element)),
            id: newElementId,
          };
        }
      });

      // Create new layer
      const newLayer: Layer = {
        id: newLayerId,
        name: `${sourceLayer.name} (copia)`,
        visible: sourceLayer.visible,
        locked: false,
        opacity: sourceLayer.opacity,
        elements: sourceLayer.elements.map(id => elementIdMap[id]).filter(Boolean),
      };

      const sourceIndex = state.layers.findIndex(l => l.id === action.payload);
      state.layers.splice(sourceIndex + 1, 0, newLayer);
      state.activeLayerId = newLayerId;
    },

    // Layers Panel actions
    toggleLayersPanel: (state) => {
      state.layersPanel.isOpen = !state.layersPanel.isOpen;
    },

    setLayersPanelPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.layersPanel.position = action.payload;
    },

    toggleLayersPanelCollapse: (state) => {
      state.layersPanel.isCollapsed = !state.layersPanel.isCollapsed;
    },

    // Canvas actions
    setZoom: (state, action: PayloadAction<number>) => {
      state.canvas.zoom = Math.min(Math.max(action.payload, 0.1), 5);
    },

    setOffset: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.canvas.offsetX = action.payload.x;
      state.canvas.offsetY = action.payload.y;
    },

    resetView: (state) => {
      state.canvas.zoom = 1;
      state.canvas.offsetX = 0;
      state.canvas.offsetY = 0;
    },

    // Clear canvas
    clearCanvas: (state) => {
      saveToHistory(state);
      state.elements = {};
      state.layers.forEach(layer => {
        layer.elements = [];
      });
      state.selectedElementIds = [];
    },

    // Undo/Redo actions
    undo: (state) => {
      if (state.history.past.length === 0) return;

      const currentState = {
        ...state,
        history: { past: [], future: [] },
      };
      state.history.future.unshift(JSON.parse(JSON.stringify(currentState)));

      const previousState = state.history.past.pop()!;

      // Restore state
      state.tool = previousState.tool;
      state.strokeColor = previousState.strokeColor;
      state.fillColor = previousState.fillColor;
      state.strokeWidth = previousState.strokeWidth;
      state.opacity = previousState.opacity;
      state.elements = previousState.elements;
      state.layers = previousState.layers;
      state.activeLayerId = previousState.activeLayerId;
      state.selectedElementIds = previousState.selectedElementIds;
      state.isDrawing = false;
      state.shapeStart = null;
      state.currentShapeId = null;
    },

    redo: (state) => {
      if (state.history.future.length === 0) return;

      const currentState = {
        ...state,
        history: { past: [], future: [] },
      };
      state.history.past.push(JSON.parse(JSON.stringify(currentState)));

      const nextState = state.history.future.shift()!;

      // Restore state
      state.tool = nextState.tool;
      state.strokeColor = nextState.strokeColor;
      state.fillColor = nextState.fillColor;
      state.strokeWidth = nextState.strokeWidth;
      state.opacity = nextState.opacity;
      state.elements = nextState.elements;
      state.layers = nextState.layers;
      state.activeLayerId = nextState.activeLayerId;
      state.selectedElementIds = nextState.selectedElementIds;
      state.isDrawing = false;
      state.shapeStart = null;
      state.currentShapeId = null;
    },

    // AI actions
    startAiSelection: (state, action: PayloadAction<Point>) => {
      state.ai.isSelecting = true;
      state.ai.selectionPoints = [action.payload.x, action.payload.y];
    },

    continueAiSelection: (state, action: PayloadAction<Point>) => {
      if (!state.ai.isSelecting) return;
      state.ai.selectionPoints.push(action.payload.x, action.payload.y);
    },

    endAiSelection: (state) => {
      state.ai.isSelecting = false;
    },

    clearAiSelection: (state) => {
      state.ai.selectionPoints = [];
      state.ai.isSelecting = false;
    },

    setAiCursorPosition: (state, action: PayloadAction<Point | null>) => {
      state.ai.cursorPosition = action.payload;
    },

    setAiProcessing: (state, action: PayloadAction<boolean>) => {
      state.ai.isProcessing = action.payload;
    },

    // Restore project from JSON
    restoreProject: (state, action: PayloadAction<{
      canvas: EditorState['canvas'];
      elements: EditorState['elements'];
      layers: EditorState['layers'];
      layersPanel?: EditorState['layersPanel'];
    }>) => {
      const { canvas, elements, layers, layersPanel } = action.payload;

      // Save current state to history before restoring
      saveToHistory(state);

      // Restore canvas settings (keep current zoom/offset for user convenience)
      state.canvas.width = canvas.width;
      state.canvas.height = canvas.height;

      // Restore elements and layers
      state.elements = elements;
      state.layers = layers;

      // Restore layers panel state if present
      if (layersPanel) {
        state.layersPanel = layersPanel;
      }

      // Set active layer to first layer if current doesn't exist
      if (layers.length > 0 && !layers.find(l => l.id === state.activeLayerId)) {
        state.activeLayerId = layers[0].id;
      }

      // Clear selection
      state.selectedElementIds = [];
      state.isDrawing = false;
      state.shapeStart = null;
      state.currentShapeId = null;
    },
  },
});

export const {
  setTool,
  setStrokeColor,
  setFillColor,
  setStrokeWidth,
  setOpacity,
  // Brush settings actions
  setBrushMode,
  setNaturalBrushPreset,
  setStabilizerEnabled,
  setStabilizerStrength,
  setPressureEnabled,
  setPressureSensitivity,
  setSmoothingEnabled,
  setSmoothingStrength,
  updateBrushSettings,
  // Drawing actions
  setIsDrawing,
  startDrawing,
  continueDrawing,
  endDrawing,
  // Binary stroke actions
  finalizeStrokeWithBuffer,
  startStrokeCapture,
  updateStrokePoints,
  // Shape actions
  startShape,
  updateShape,
  endShape,
  addElement,
  addImage,
  // Text actions
  setFontSize,
  setFontFamily,
  startTextEditing,
  updateTextContent,
  finishTextEditing,
  editExistingText,
  updateElement,
  deleteElement,
  deleteSelectedElements,
  selectElement,
  addToSelection,
  clearSelection,
  addLayer,
  setActiveLayer,
  toggleLayerVisibility,
  toggleLayerLock,
  setLayerOpacity,
  renameLayer,
  deleteLayer,
  reorderLayers,
  duplicateLayer,
  toggleLayersPanel,
  setLayersPanelPosition,
  toggleLayersPanelCollapse,
  setZoom,
  setOffset,
  resetView,
  clearCanvas,
  undo,
  redo,
  // AI actions
  startAiSelection,
  continueAiSelection,
  endAiSelection,
  clearAiSelection,
  setAiCursorPosition,
  setAiProcessing,
  // Restore project
  restoreProject,
} = editorSlice.actions;

export default editorSlice.reducer;
