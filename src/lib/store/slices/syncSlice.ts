import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Sync State Management
 *
 * Maneja el estado de sincronización del proyecto:
 * - Dirty flags: qué ha cambiado desde el último save
 * - Estado de sincronización: saved, saving, error, offline
 * - Backup local: para recuperación ante fallos
 * - Retry logic: reintentos con backoff exponencial
 */

export type SyncStatus = 'saved' | 'saving' | 'pending' | 'error' | 'offline';

export type DirtyField = 'elements' | 'layers' | 'canvas';

interface SyncState {
  // Dirty flags - indica qué ha cambiado desde el último save exitoso
  isDirty: boolean;
  dirtyFields: Set<DirtyField>;

  // Estado de sincronización
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;

  // Retry logic
  retryCount: number;
  maxRetries: number;

  // Versioning para detectar conflictos
  localVersion: number;
  serverVersion: number | null;

  // Backup info
  hasLocalBackup: boolean;
  lastBackupAt: number | null;

  // Project ID actual (para saber qué proyecto estamos editando)
  projectId: string | null;
}

// Serializable state for Redux (Set no es serializable)
interface SerializableSyncState {
  isDirty: boolean;
  dirtyFields: DirtyField[];
  status: SyncStatus;
  lastSyncedAt: number | null;
  lastError: string | null;
  retryCount: number;
  maxRetries: number;
  localVersion: number;
  serverVersion: number | null;
  hasLocalBackup: boolean;
  lastBackupAt: number | null;
  projectId: string | null;
}

const initialState: SerializableSyncState = {
  isDirty: false,
  dirtyFields: [],
  status: 'saved',
  lastSyncedAt: null,
  lastError: null,
  retryCount: 0,
  maxRetries: 3,
  localVersion: 0,
  serverVersion: null,
  hasLocalBackup: false,
  lastBackupAt: null,
  projectId: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    /**
     * Inicializa el sync state para un proyecto
     */
    initSync: (state, action: PayloadAction<{ projectId: string; serverVersion?: number }>) => {
      state.projectId = action.payload.projectId;
      state.serverVersion = action.payload.serverVersion ?? null;
      state.isDirty = false;
      state.dirtyFields = [];
      state.status = 'saved';
      state.lastError = null;
      state.retryCount = 0;
      state.localVersion = 0;
    },

    /**
     * Marca campos específicos como dirty
     * Solo marca si no estaba ya dirty ese campo (evita re-renders innecesarios)
     */
    markDirty: (state, action: PayloadAction<DirtyField | DirtyField[]>) => {
      const fields = Array.isArray(action.payload) ? action.payload : [action.payload];

      let changed = false;
      fields.forEach(field => {
        if (!state.dirtyFields.includes(field)) {
          state.dirtyFields.push(field);
          changed = true;
        }
      });

      if (changed) {
        state.isDirty = true;
        state.localVersion += 1;

        // Si estaba en 'saved', cambiar a 'pending'
        if (state.status === 'saved') {
          state.status = 'pending';
        }
      }
    },

    /**
     * Indica que se está guardando
     */
    startSaving: (state) => {
      state.status = 'saving';
    },

    /**
     * Marca como sincronizado después de save exitoso
     */
    markSynced: (state, action: PayloadAction<{ serverVersion?: number; timestamp?: number }>) => {
      state.isDirty = false;
      state.dirtyFields = [];
      state.status = 'saved';
      state.lastSyncedAt = action.payload.timestamp ?? Date.now();
      state.lastError = null;
      state.retryCount = 0;

      if (action.payload.serverVersion !== undefined) {
        state.serverVersion = action.payload.serverVersion;
      }
    },

    /**
     * Registra un error de sincronización
     */
    setSyncError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.lastError = action.payload;
      state.retryCount += 1;
    },

    /**
     * Marca como offline
     */
    setOffline: (state) => {
      state.status = 'offline';
    },

    /**
     * Marca como online (vuelve a pending si había cambios)
     */
    setOnline: (state) => {
      if (state.isDirty) {
        state.status = 'pending';
        state.retryCount = 0; // Reset retries al reconectar
      } else {
        state.status = 'saved';
      }
    },

    /**
     * Actualiza info del backup local
     */
    setLocalBackup: (state, action: PayloadAction<{ exists: boolean; timestamp?: number }>) => {
      state.hasLocalBackup = action.payload.exists;
      if (action.payload.timestamp) {
        state.lastBackupAt = action.payload.timestamp;
      }
    },

    /**
     * Reset del retry count (para retry manual)
     */
    resetRetry: (state) => {
      state.retryCount = 0;
      if (state.isDirty) {
        state.status = 'pending';
      }
    },

    /**
     * Reset completo (cuando se cierra el proyecto)
     */
    resetSync: () => initialState,
  },
});

export const {
  initSync,
  markDirty,
  startSaving,
  markSynced,
  setSyncError,
  setOffline,
  setOnline,
  setLocalBackup,
  resetRetry,
  resetSync,
} = syncSlice.actions;

export default syncSlice.reducer;

// ============ SELECTORS ============

export const selectSyncState = (state: { sync: SerializableSyncState }) => state.sync;
export const selectIsDirty = (state: { sync: SerializableSyncState }) => state.sync.isDirty;
export const selectSyncStatus = (state: { sync: SerializableSyncState }) => state.sync.status;
export const selectDirtyFields = (state: { sync: SerializableSyncState }) => state.sync.dirtyFields;
export const selectCanRetry = (state: { sync: SerializableSyncState }) =>
  state.sync.retryCount < state.sync.maxRetries;
export const selectLastSyncedAt = (state: { sync: SerializableSyncState }) => state.sync.lastSyncedAt;
export const selectSyncError = (state: { sync: SerializableSyncState }) => state.sync.lastError;
export const selectProjectId = (state: { sync: SerializableSyncState }) => state.sync.projectId;
