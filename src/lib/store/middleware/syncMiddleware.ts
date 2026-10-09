import { Middleware, AnyAction, isAction } from '@reduxjs/toolkit';
import { markDirty, DirtyField } from '../slices/syncSlice';

/**
 * Middleware que detecta automáticamente cambios en el editor
 * y marca los campos apropiados como dirty.
 *
 * Esto evita tener que llamar manualmente a markDirty en cada action.
 */

// Actions que modifican elements
const ELEMENT_ACTIONS = [
  'editor/startDrawing',
  'editor/continueDrawing',
  'editor/endDrawing',
  'editor/startShape',
  'editor/updateShape',
  'editor/endShape',
  'editor/addElement',
  'editor/addImage',
  'editor/updateElement',
  'editor/deleteElement',
  'editor/deleteSelectedElements',
  'editor/clearCanvas',
  'editor/undo',
  'editor/redo',
];

// Actions que modifican layers
const LAYER_ACTIONS = [
  'editor/addLayer',
  'editor/deleteLayer',
  'editor/reorderLayers',
  'editor/duplicateLayer',
  'editor/renameLayer',
  'editor/toggleLayerVisibility',
  'editor/toggleLayerLock',
  'editor/setLayerOpacity',
  // Estas también afectan layers porque añaden elementos a una layer
  'editor/startDrawing',
  'editor/startShape',
  'editor/addElement',
  'editor/addImage',
  'editor/deleteElement',
  'editor/deleteSelectedElements',
  'editor/clearCanvas',
  'editor/undo',
  'editor/redo',
];

// Actions que modifican canvas (dimensiones, no zoom/offset que son de UI)
const CANVAS_ACTIONS = [
  'editor/restoreProject', // Cuando se restaura puede cambiar el canvas
];

// Actions que NO deben triggear dirty (son de UI, no de contenido)
const UI_ONLY_ACTIONS = [
  'editor/setTool',
  'editor/setStrokeColor',
  'editor/setFillColor',
  'editor/setStrokeWidth',
  'editor/setOpacity',
  'editor/selectElement',
  'editor/addToSelection',
  'editor/clearSelection',
  'editor/setZoom',
  'editor/setOffset',
  'editor/resetView',
  'editor/setActiveLayer',
  'editor/toggleLayersPanel',
  'editor/setLayersPanelPosition',
  'editor/toggleLayersPanelCollapse',
  'editor/setIsDrawing',
  // AI selection actions (son temporales)
  'editor/startAiSelection',
  'editor/continueAiSelection',
  'editor/endAiSelection',
  'editor/clearAiSelection',
  'editor/setAiCursorPosition',
  'editor/setAiProcessing',
];

export const syncMiddleware: Middleware = (store) => (next) => (action: unknown) => {
  // Ejecutar la action primero
  const result = next(action);

  // Type guard para verificar que es una action válida
  if (!isAction(action)) {
    return result;
  }

  const actionType = action.type;

  // Solo procesar actions del editor
  if (typeof actionType !== 'string' || !actionType.startsWith('editor/')) {
    return result;
  }

  // Ignorar actions de solo UI
  if (UI_ONLY_ACTIONS.includes(actionType)) {
    return result;
  }

  // Determinar qué campos marcar como dirty
  const dirtyFields: DirtyField[] = [];

  if (ELEMENT_ACTIONS.includes(actionType)) {
    dirtyFields.push('elements');
  }

  if (LAYER_ACTIONS.includes(actionType)) {
    dirtyFields.push('layers');
  }

  if (CANVAS_ACTIONS.includes(actionType)) {
    dirtyFields.push('canvas');
  }

  // Solo dispatch si hay campos dirty y hay un proyecto activo
  const state = store.getState() as { sync?: { projectId: string | null } };
  if (dirtyFields.length > 0 && state.sync?.projectId) {
    store.dispatch(markDirty(dirtyFields));
  }

  return result;
};
