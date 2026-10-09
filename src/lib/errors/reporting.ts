/**
 * Error Reporting Service
 *
 * Servicio centralizado para reportar errores.
 * Preparado para integración con servicios externos (Sentry, LogRocket, etc.)
 */

// ============ TYPES ============

export interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  componentStack?: string;
  context?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: {
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
    memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number };
  };
  tags: Record<string, string>;
  breadcrumbs: Breadcrumb[];
}

export interface Breadcrumb {
  timestamp: number;
  category: 'action' | 'navigation' | 'error' | 'console' | 'user';
  message: string;
  data?: Record<string, unknown>;
}

type ErrorSeverity = ErrorReport['severity'];

// ============ CONFIGURATION ============

interface ReportingConfig {
  enabled: boolean;
  maxBreadcrumbs: number;
  maxStoredErrors: number;
  consoleLog: boolean;
  localStorage: boolean;
  // Endpoints externos (para futuro)
  sentryDsn?: string;
  customEndpoint?: string;
}

const defaultConfig: ReportingConfig = {
  enabled: true,
  maxBreadcrumbs: 50,
  maxStoredErrors: 20,
  consoleLog: process.env.NODE_ENV === 'development',
  localStorage: true,
};

// ============ STATE ============

let config = { ...defaultConfig };
const breadcrumbs: Breadcrumb[] = [];
const ERROR_STORAGE_KEY = 'error_reports';

// ============ CONFIGURATION ============

export function configureErrorReporting(options: Partial<ReportingConfig>): void {
  config = { ...config, ...options };
}

// ============ BREADCRUMBS ============

/**
 * Agrega un breadcrumb para contexto
 */
export function addBreadcrumb(
  category: Breadcrumb['category'],
  message: string,
  data?: Record<string, unknown>
): void {
  if (!config.enabled) return;

  breadcrumbs.push({
    timestamp: Date.now(),
    category,
    message,
    data,
  });

  // Mantener límite
  while (breadcrumbs.length > config.maxBreadcrumbs) {
    breadcrumbs.shift();
  }
}

/**
 * Limpia todos los breadcrumbs
 */
export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

// ============ ERROR REPORTING ============

/**
 * Genera un ID único para el error
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determina la severidad basada en el contexto
 */
function determineSeverity(context?: string, error?: Error): ErrorSeverity {
  // Errores críticos
  if (context?.includes('Canvas') || context?.includes('Store')) {
    return 'critical';
  }

  // Errores de rendering
  if (context?.includes('Layer') || context?.includes('Element')) {
    return 'high';
  }

  // Errores de UI
  if (context?.includes('Panel') || context?.includes('Toolbar')) {
    return 'medium';
  }

  return 'low';
}

/**
 * Recopila metadata del entorno
 */
function collectMetadata(): ErrorReport['metadata'] {
  const metadata: ErrorReport['metadata'] = {
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    viewport: {
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
    },
  };

  // Performance memory (solo Chrome)
  if (typeof window !== 'undefined' && 'performance' in window) {
    const perf = window.performance as Performance & {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
    };
    if (perf.memory) {
      metadata.memory = {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize,
      };
    }
  }

  return metadata;
}

/**
 * Reporta un error
 */
export function reportError(
  error: Error,
  options: {
    context?: string;
    componentStack?: string;
    tags?: Record<string, string>;
    severity?: ErrorSeverity;
  } = {}
): ErrorReport {
  const { context, componentStack, tags = {}, severity } = options;

  const report: ErrorReport = {
    id: generateErrorId(),
    timestamp: Date.now(),
    message: error.message,
    stack: error.stack,
    componentStack,
    context,
    severity: severity || determineSeverity(context, error),
    metadata: collectMetadata(),
    tags: {
      ...tags,
      environment: process.env.NODE_ENV || 'unknown',
    },
    breadcrumbs: [...breadcrumbs],
  };

  // Console log
  if (config.consoleLog) {
    console.group(`[ErrorReport] ${report.id}`);
    console.error('Message:', report.message);
    console.log('Context:', report.context);
    console.log('Severity:', report.severity);
    console.log('Breadcrumbs:', report.breadcrumbs.length);
    if (report.stack) console.log('Stack:', report.stack);
    console.groupEnd();
  }

  // Local storage
  if (config.localStorage) {
    saveToLocalStorage(report);
  }

  // Enviar a servicios externos
  sendToExternalServices(report);

  return report;
}

/**
 * Guarda el reporte en localStorage
 */
function saveToLocalStorage(report: ErrorReport): void {
  try {
    const stored = JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]');
    stored.push({
      id: report.id,
      timestamp: report.timestamp,
      message: report.message,
      context: report.context,
      severity: report.severity,
    });

    while (stored.length > config.maxStoredErrors) {
      stored.shift();
    }

    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Silenciar errores de storage
  }
}

/**
 * Envía a servicios externos (placeholder para integración futura)
 */
async function sendToExternalServices(report: ErrorReport): Promise<void> {
  // Sentry
  if (config.sentryDsn) {
    // TODO: Integrar con Sentry
    // Sentry.captureException(new Error(report.message), { extra: report });
  }

  // Custom endpoint
  if (config.customEndpoint) {
    try {
      await fetch(config.customEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch {
      // Silenciar errores de red
    }
  }
}

// ============ ERROR RETRIEVAL ============

/**
 * Obtiene errores almacenados
 */
export function getStoredErrors(): Partial<ErrorReport>[] {
  try {
    return JSON.parse(localStorage.getItem(ERROR_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Limpia errores almacenados
 */
export function clearStoredErrors(): void {
  localStorage.removeItem(ERROR_STORAGE_KEY);
}

// ============ GLOBAL ERROR HANDLERS ============

/**
 * Configura handlers globales para errores no capturados
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  // Errores no capturados
  window.onerror = (message, source, lineno, colno, error) => {
    addBreadcrumb('error', `Uncaught: ${message}`);

    if (error) {
      reportError(error, {
        context: 'GlobalHandler',
        tags: {
          source: source || 'unknown',
          line: String(lineno),
          column: String(colno),
        },
      });
    }

    return false; // Permite que el error se propague
  };

  // Promesas rechazadas no manejadas
  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    addBreadcrumb('error', `Unhandled Promise: ${error.message}`);

    reportError(error, {
      context: 'UnhandledPromise',
      severity: 'high',
    });
  };

  // Interceptar console.error para breadcrumbs
  const originalConsoleError = console.error;
  console.error = (...args) => {
    addBreadcrumb('console', args.map(a => String(a)).join(' '));
    originalConsoleError.apply(console, args);
  };
}

// ============ REACT INTEGRATION ============

/**
 * Hook para reportar errores manualmente
 */
export function useErrorReporting() {
  return {
    reportError,
    addBreadcrumb,
    getStoredErrors,
    clearStoredErrors,
  };
}
