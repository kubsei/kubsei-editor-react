import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import {
  selectIsDirty,
  selectSyncStatus,
  selectCanRetry,
  selectProjectId,
  selectDirtyFields,
  initSync,
  startSaving,
  markSynced,
  setSyncError,
  setOffline,
  setOnline,
  setLocalBackup,
  resetSync,
} from '@/lib/store/slices/syncSlice';
import { useSaveProjectState } from '@/lib/graphql/hooks/useProjects';

// Constantes de configuración
const DEBOUNCE_MS = 2000; // 2 segundos de debounce
const BACKUP_KEY_PREFIX = 'project-backup-';
const MAX_RETRY_DELAY = 30000; // 30 segundos máximo entre retries

interface UseAutoSaveOptions {
  projectId: string;
  enabled?: boolean;
}

interface BackupData {
  timestamp: number;
  version: number;
  data: {
    elements: Record<string, unknown>;
    layers: unknown[];
    canvas: {
      width: number;
      height: number;
      zoom: number;
    };
  };
}

/**
 * Hook que maneja el auto-guardado con:
 * - Dirty flags para detectar cambios
 * - Backup local inmediato en localStorage
 * - Debounce antes de enviar al servidor
 * - Retry con backoff exponencial
 * - Detección de offline/online
 */
export function useAutoSave({ projectId, enabled = true }: UseAutoSaveOptions) {
  const dispatch = useDispatch();
  const saveProjectMutation = useSaveProjectState();

  // Selectors
  const isDirty = useSelector(selectIsDirty);
  const syncStatus = useSelector(selectSyncStatus);
  const canRetry = useSelector(selectCanRetry);
  const currentProjectId = useSelector(selectProjectId);
  const dirtyFields = useSelector(selectDirtyFields);
  const hasLocalBackup = useSelector((state: RootState) => state.sync.hasLocalBackup);

  // Editor state para guardar - usando refs para evitar re-renders
  const editorState = useSelector((state: RootState) => state.editor);
  const editorStateRef = useRef(editorState);

  // Refs para evitar stale closures y ciclos
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const projectIdRef = useRef(projectId);

  // ============ BACKUP LOCAL ============
  // Nota: saveLocalBackup NO hace dispatch para evitar ciclos de re-render
  // Solo guardamos en localStorage, el estado de Redux se actualiza en otros momentos

  const saveLocalBackup = useCallback(() => {
    const pid = projectIdRef.current;
    if (!pid) return;

    const state = editorStateRef.current;
    const backupData: BackupData = {
      timestamp: Date.now(),
      version: Date.now(),
      data: {
        elements: state.elements,
        layers: state.layers,
        canvas: {
          width: state.canvas.width,
          height: state.canvas.height,
          zoom: state.canvas.zoom,
        },
      },
    };

    try {
      localStorage.setItem(
        `${BACKUP_KEY_PREFIX}${pid}`,
        JSON.stringify(backupData)
      );
      // NO dispatch aquí para evitar ciclos
    } catch (error) {
      console.warn('[AutoSave] Failed to save local backup:', error);
    }
  }, []); // Sin dependencias - usa refs

  const clearLocalBackup = useCallback(() => {
    const pid = projectIdRef.current;
    if (!pid) return;

    try {
      localStorage.removeItem(`${BACKUP_KEY_PREFIX}${pid}`);
      dispatch(setLocalBackup({ exists: false }));
    } catch (error) {
      console.warn('[AutoSave] Failed to clear local backup:', error);
    }
  }, [dispatch]);

  const getLocalBackup = useCallback((): BackupData | null => {
    const pid = projectIdRef.current;
    if (!pid) return null;

    try {
      const data = localStorage.getItem(`${BACKUP_KEY_PREFIX}${pid}`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  // ============ RETRY LOGIC ============

  // Ref para el retry count (evitamos stale closures)
  const retryCountRef = useRef(0);

  // Actualizar ref cuando cambia el selector
  const syncState = useSelector((state: RootState) => state.sync);
  useEffect(() => {
    retryCountRef.current = syncState.retryCount;
  }, [syncState.retryCount]);

  // Kept current by the effect below; breaks the saveToServer <-> scheduleRetry cycle
  const saveToServerRef = useRef<() => Promise<void>>(async () => {});

  const scheduleRetry = useCallback(() => {
    // Limpiar retry anterior
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    // Backoff exponencial: 2s, 4s, 8s, 16s, max 30s
    const delay = Math.min(2000 * Math.pow(2, retryCountRef.current), MAX_RETRY_DELAY);

    console.log(`[AutoSave] Scheduling retry in ${delay}ms`);

    retryTimerRef.current = setTimeout(() => {
      if (isOnlineRef.current) {
        saveToServerRef.current();
      }
    }, delay);
  }, []);

  // ============ SAVE TO SERVER ============
  // Refs para evitar dependencias en saveToServer
  const isDirtyRef = useRef(isDirty);
  const canRetryRef = useRef(canRetry);

  const saveToServer = useCallback(async () => {
    const pid = projectIdRef.current;
    if (!pid || !isDirtyRef.current) return;

    // No intentar si estamos offline
    if (!isOnlineRef.current) {
      dispatch(setOffline());
      return;
    }

    dispatch(startSaving());

    const state = editorStateRef.current;
    try {
      await saveProjectMutation.mutateAsync({
        id: pid,
        state: {
          canvas: {
            width: state.canvas.width,
            height: state.canvas.height,
            zoom: state.canvas.zoom,
          },
          elements: state.elements,
          layers: state.layers,
        },
      });

      // Success
      dispatch(markSynced({ timestamp: Date.now() }));
      clearLocalBackup();
      console.log('[AutoSave] Saved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AutoSave] Save failed:', errorMessage);
      dispatch(setSyncError(errorMessage));

      // Programar retry si podemos
      if (canRetryRef.current) {
        scheduleRetry();
      }
    }
  }, [saveProjectMutation, dispatch, clearLocalBackup, scheduleRetry]);

  // ============ DEBOUNCED SAVE ============
  // Kept current by the effect below, so its timer can re-schedule itself
  const debouncedSaveRef = useRef<() => void>(() => {});

  const debouncedSave = useCallback(() => {
    // Limpiar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Backup inmediato (no debounced)
    saveLocalBackup();

    // Debounce el envío al servidor
    debounceTimerRef.current = setTimeout(() => {
      // No guardar si está dibujando activamente
      const state = editorStateRef.current;
      if (state.isDrawing) {
        // Re-programar para cuando termine
        debouncedSaveRef.current();
        return;
      }

      saveToServerRef.current();
    }, DEBOUNCE_MS);
  }, [saveLocalBackup]); // Solo depende de saveLocalBackup que es estable

  // ============ EFFECTS ============

  // Keep the "latest value" refs current (refs must not be written during render).
  // Declared first, so the effects below already see this render's values.
  useEffect(() => {
    editorStateRef.current = editorState;
    projectIdRef.current = projectId;
    isDirtyRef.current = isDirty;
    canRetryRef.current = canRetry;
    saveToServerRef.current = saveToServer;
    debouncedSaveRef.current = debouncedSave;
  });

  // Inicializar sync state cuando cambia el proyecto
  useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      dispatch(initSync({ projectId }));

      // Verificar si hay backup local
      const backup = getLocalBackup();
      if (backup) {
        dispatch(setLocalBackup({ exists: true, timestamp: backup.timestamp }));
        console.log('[AutoSave] Found local backup from', new Date(backup.timestamp));
      }
    }

    return () => {
      // Cleanup al desmontar
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [projectId, currentProjectId, dispatch, getLocalBackup]);

  // Trigger save cuando hay cambios (isDirty)
  useEffect(() => {
    if (!enabled || !projectId || !isDirty) return;

    // Solo si no estamos ya guardando o en error sin retries
    if (syncStatus === 'saving') return;
    if (syncStatus === 'error' && !canRetry) return;

    debouncedSaveRef.current();
  }, [enabled, projectId, isDirty, syncStatus, canRetry]);

  // Detectar online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log('[AutoSave] Back online');
      isOnlineRef.current = true;
      dispatch(setOnline());

      // Si hay cambios pendientes, intentar guardar
      if (isDirtyRef.current) {
        debouncedSaveRef.current();
      }
    };

    const handleOffline = () => {
      console.log('[AutoSave] Gone offline');
      isOnlineRef.current = false;
      dispatch(setOffline());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // Guardar antes de cerrar la página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        // Guardar backup final
        saveLocalBackup();

        // Mostrar warning al usuario
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveLocalBackup]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      dispatch(resetSync());
    };
  }, [dispatch]);

  // ============ RETURN ============

  return {
    // Estado
    isDirty,
    syncStatus,
    canRetry,
    dirtyFields,

    // Acciones manuales
    saveNow: saveToServer,
    retryNow: () => {
      if (canRetryRef.current) {
        saveToServerRef.current();
      }
    },

    // Backup
    hasLocalBackup,
    getLocalBackup,
    clearLocalBackup,
  };
}
