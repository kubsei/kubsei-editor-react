/**
 * Error Recovery Utilities
 *
 * Herramientas para recuperación de errores en el editor:
 * - Backup automático del estado
 * - Restauración desde backup
 * - Limpieza de elementos corruptos
 * - Validación de estado
 */

import { EditorState, CanvasElement, DrawingElement } from '@/types/editor';

// ============ TYPES ============

interface StateBackup {
  timestamp: number;
  state: Partial<EditorState>;
  reason: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  corruptedElements: string[];
}

// ============ BACKUP MANAGEMENT ============

const BACKUP_KEY = 'editor_error_backup';
const MAX_BACKUPS = 5;

/**
 * Guarda un backup del estado antes de una operación riesgosa
 */
export function saveStateBackup(state: EditorState, reason: string): void {
  try {
    const backups: StateBackup[] = JSON.parse(
      localStorage.getItem(BACKUP_KEY) || '[]'
    );

    const backup: StateBackup = {
      timestamp: Date.now(),
      state: {
        elements: state.elements,
        layers: state.layers,
        canvas: state.canvas,
      },
      reason,
    };

    backups.push(backup);

    // Mantener solo los últimos N backups
    while (backups.length > MAX_BACKUPS) {
      backups.shift();
    }

    localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
    console.log(`[Recovery] Backup saved: ${reason}`);
  } catch (error) {
    console.error('[Recovery] Failed to save backup:', error);
  }
}

/**
 * Obtiene la lista de backups disponibles
 */
export function getAvailableBackups(): StateBackup[] {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Restaura el estado desde un backup
 */
export function restoreFromBackup(timestamp: number): Partial<EditorState> | null {
  const backups = getAvailableBackups();
  const backup = backups.find(b => b.timestamp === timestamp);

  if (!backup) {
    console.error('[Recovery] Backup not found:', timestamp);
    return null;
  }

  console.log(`[Recovery] Restoring from backup: ${backup.reason}`);
  return backup.state;
}

/**
 * Restaura el backup más reciente
 */
export function restoreLatestBackup(): Partial<EditorState> | null {
  const backups = getAvailableBackups();
  if (backups.length === 0) return null;

  const latest = backups[backups.length - 1];
  return restoreFromBackup(latest.timestamp);
}

/**
 * Limpia todos los backups
 */
export function clearBackups(): void {
  localStorage.removeItem(BACKUP_KEY);
}

// ============ STATE VALIDATION ============

/**
 * Valida el estado del editor y detecta elementos corruptos
 */
export function validateEditorState(state: EditorState): ValidationResult {
  const errors: string[] = [];
  const corruptedElements: string[] = [];

  // Validar elementos
  for (const [id, element] of Object.entries(state.elements)) {
    const elementErrors = validateElement(element);
    if (elementErrors.length > 0) {
      corruptedElements.push(id);
      errors.push(...elementErrors.map(e => `Element ${id}: ${e}`));
    }
  }

  // Validar layers
  for (const layer of state.layers) {
    // Verificar que todos los elementos referenciados existen
    for (const elementId of layer.elements) {
      if (!state.elements[elementId]) {
        errors.push(`Layer ${layer.id}: Reference to missing element ${elementId}`);
      }
    }
  }

  // Validar canvas
  if (state.canvas.width <= 0 || state.canvas.height <= 0) {
    errors.push('Canvas has invalid dimensions');
  }

  if (state.canvas.zoom <= 0 || state.canvas.zoom > 10) {
    errors.push(`Canvas zoom out of range: ${state.canvas.zoom}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    corruptedElements,
  };
}

/**
 * Valida un elemento individual
 */
function validateElement(element: CanvasElement): string[] {
  const errors: string[] = [];

  if (!element.id) {
    errors.push('Missing ID');
  }

  if (!element.type) {
    errors.push('Missing type');
  }

  if (typeof element.opacity !== 'number' || element.opacity < 0 || element.opacity > 1) {
    errors.push(`Invalid opacity: ${element.opacity}`);
  }

  // Validaciones específicas por tipo
  switch (element.type) {
    case 'drawing':
      errors.push(...validateDrawingElement(element as DrawingElement));
      break;
    // Agregar más tipos según sea necesario
  }

  return errors;
}

function validateDrawingElement(element: DrawingElement): string[] {
  const errors: string[] = [];

  // Verificar puntos
  if (!element.points && !element.bufferBase64) {
    errors.push('Drawing has no points or buffer');
  }

  if (element.points && element.points.length % 2 !== 0) {
    errors.push('Points array has odd length (should be x,y pairs)');
  }

  if (element.strokeWidth <= 0) {
    errors.push(`Invalid stroke width: ${element.strokeWidth}`);
  }

  // Verificar buffer si existe
  if (element.bufferBase64) {
    try {
      atob(element.bufferBase64);
    } catch {
      errors.push('Invalid Base64 buffer');
    }
  }

  return errors;
}

// ============ ELEMENT CLEANUP ============

/**
 * Limpia elementos corruptos del estado
 */
export function cleanCorruptedElements(
  state: EditorState,
  corruptedIds: string[]
): EditorState {
  const cleanedElements = { ...state.elements };
  const cleanedLayers = state.layers.map(layer => ({
    ...layer,
    elements: layer.elements.filter(id => !corruptedIds.includes(id)),
  }));

  // Eliminar elementos corruptos
  for (const id of corruptedIds) {
    delete cleanedElements[id];
  }

  console.log(`[Recovery] Cleaned ${corruptedIds.length} corrupted elements`);

  return {
    ...state,
    elements: cleanedElements,
    layers: cleanedLayers,
  };
}

/**
 * Intenta reparar un elemento corrupto
 */
export function repairElement(element: CanvasElement): CanvasElement | null {
  try {
    const repaired = { ...element };

    // Reparaciones comunes
    if (typeof repaired.opacity !== 'number') {
      repaired.opacity = 1;
    }
    repaired.opacity = Math.max(0, Math.min(1, repaired.opacity));

    if (typeof repaired.visible !== 'boolean') {
      repaired.visible = true;
    }

    if (typeof repaired.locked !== 'boolean') {
      repaired.locked = false;
    }

    // Reparaciones específicas por tipo
    if (repaired.type === 'drawing') {
      const drawing = repaired as DrawingElement;
      if (!drawing.points) {
        drawing.points = [];
      }
      if (drawing.strokeWidth <= 0) {
        drawing.strokeWidth = 2;
      }
    }

    return repaired;
  } catch {
    return null;
  }
}

// ============ ERROR RECOVERY STRATEGIES ============

export type RecoveryStrategy = 'retry' | 'undo' | 'restore' | 'clean' | 'reload';

interface RecoveryOption {
  strategy: RecoveryStrategy;
  label: string;
  description: string;
  action: () => void | Promise<void>;
}

/**
 * Genera opciones de recuperación basadas en el tipo de error
 */
export function getRecoveryOptions(
  errorContext: string,
  dispatch: (action: unknown) => void
): RecoveryOption[] {
  const options: RecoveryOption[] = [];

  // Siempre ofrecer retry
  options.push({
    strategy: 'retry',
    label: 'Reintentar',
    description: 'Intenta la operación de nuevo',
    action: () => {}, // El retry se maneja en el ErrorBoundary
  });

  // Si hay backup disponible
  const backups = getAvailableBackups();
  if (backups.length > 0) {
    options.push({
      strategy: 'restore',
      label: 'Restaurar backup',
      description: `Restaurar desde ${new Date(backups[backups.length - 1].timestamp).toLocaleTimeString()}`,
      action: () => {
        const state = restoreLatestBackup();
        if (state) {
          // dispatch(restoreProject(state)); // Descomentar cuando se integre
        }
      },
    });
  }

  // Opciones específicas por contexto
  if (errorContext.startsWith('Canvas') || errorContext.startsWith('Element')) {
    options.push({
      strategy: 'undo',
      label: 'Deshacer',
      description: 'Deshace el último cambio',
      action: () => {
        // dispatch(undo()); // Descomentar cuando se integre
      },
    });
  }

  // Siempre ofrecer reload como última opción
  options.push({
    strategy: 'reload',
    label: 'Recargar página',
    description: 'Recarga la aplicación completa',
    action: () => window.location.reload(),
  });

  return options;
}
