/**
 * Error Handling Module
 *
 * Exporta todas las utilidades de manejo de errores
 */

// Recovery utilities
export {
  saveStateBackup,
  getAvailableBackups,
  restoreFromBackup,
  restoreLatestBackup,
  clearBackups,
  validateEditorState,
  cleanCorruptedElements,
  repairElement,
  getRecoveryOptions,
  type RecoveryStrategy,
} from './recovery';

// Error reporting
export {
  configureErrorReporting,
  addBreadcrumb,
  clearBreadcrumbs,
  reportError,
  getStoredErrors,
  clearStoredErrors,
  setupGlobalErrorHandlers,
  useErrorReporting,
  type ErrorReport,
  type Breadcrumb,
} from './reporting';
