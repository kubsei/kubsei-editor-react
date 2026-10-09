'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

// ============ TYPES ============

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  context?: string;
  recoverable: boolean;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Contexto para identificar dónde ocurrió el error */
  context?: string;
  /** Fallback UI personalizado */
  fallback?: ReactNode | ((error: ErrorDetails, retry: () => void) => ReactNode);
  /** Callback cuando ocurre un error */
  onError?: (error: ErrorDetails) => void;
  /** Si se puede recuperar (mostrar botón retry) */
  recoverable?: boolean;
  /** Nivel de aislamiento */
  isolationLevel?: 'component' | 'section' | 'page';
  /** Mostrar detalles técnicos (solo desarrollo) */
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: ErrorDetails | null;
  retryCount: number;
}

// ============ ERROR BOUNDARY CLASS ============

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps = {
    recoverable: true,
    isolationLevel: 'component' as const,
    showDetails: process.env.NODE_ENV === 'development',
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        recoverable: true,
      },
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { context, onError, recoverable = true } = this.props;

    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      timestamp: Date.now(),
      context,
      recoverable,
    };

    this.setState({ error: errorDetails });

    console.error(`[ErrorBoundary${context ? `:${context}` : ''}]`, error);
    console.error('Component Stack:', errorInfo.componentStack);

    onError?.(errorDetails);
    this.reportError(errorDetails);
  }

  private reportError(error: ErrorDetails): void {
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push({
        ...error,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      if (errors.length > 10) errors.shift();
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch {
      // Silenciar errores de localStorage
    }
  }

  private handleRetry = (): void => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render(): ReactNode {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, recoverable, showDetails, context, isolationLevel } = this.props;

    if (!hasError || !error) {
      return children;
    }

    if (typeof fallback === 'function') {
      return fallback(error, this.handleRetry);
    }
    if (fallback) {
      return fallback;
    }

    return (
      <DefaultErrorFallback
        error={error}
        onRetry={recoverable ? this.handleRetry : undefined}
        retryCount={retryCount}
        showDetails={showDetails}
        context={context}
        isolationLevel={isolationLevel}
      />
    );
  }
}

// ============ DEFAULT FALLBACK UI ============

interface DefaultErrorFallbackProps {
  error: ErrorDetails;
  onRetry?: () => void;
  retryCount: number;
  showDetails?: boolean;
  context?: string;
  isolationLevel?: 'component' | 'section' | 'page';
}

function DefaultErrorFallback({
  error,
  onRetry,
  retryCount,
  showDetails,
  context,
  isolationLevel,
}: DefaultErrorFallbackProps) {
  const isPageLevel = isolationLevel === 'page';
  const maxRetries = 3;
  const canRetry = onRetry && retryCount < maxRetries;

  return (
    <div
      className={`
        flex flex-col items-center justify-center p-4
        ${isPageLevel ? 'min-h-screen bg-gray-50' : 'min-h-[200px] bg-red-50 rounded-lg border border-red-200'}
      `}
    >
      <div className={`${isPageLevel ? 'text-6xl mb-4' : 'text-3xl mb-2'}`}>
        {isPageLevel ? '🔧' : '⚠️'}
      </div>

      <h2 className={`font-semibold text-gray-800 ${isPageLevel ? 'text-2xl mb-2' : 'text-lg mb-1'}`}>
        {isPageLevel ? 'Algo salió mal' : `Error en ${context || 'componente'}`}
      </h2>

      <p className="text-gray-600 text-center max-w-md mb-4">
        {isPageLevel
          ? 'Ha ocurrido un error inesperado. Por favor, intenta recargar la página.'
          : 'Este componente ha encontrado un problema.'}
      </p>

      <div className="flex gap-2">
        {canRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            Reintentar {retryCount > 0 && `(${retryCount}/${maxRetries})`}
          </button>
        )}

        {isPageLevel && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Recargar página
          </button>
        )}
      </div>

      {showDetails && (
        <details className="mt-4 w-full max-w-2xl">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            Detalles técnicos
          </summary>
          <div className="mt-2 p-3 bg-gray-800 text-gray-100 rounded-md text-xs font-mono overflow-auto max-h-48">
            <p className="text-red-400">{error.message}</p>
            {error.stack && (
              <pre className="mt-2 text-gray-400 whitespace-pre-wrap">{error.stack}</pre>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

export default ErrorBoundary;
