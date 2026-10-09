'use client';

import React, { ReactNode, useCallback } from 'react';
import { ErrorBoundary, ErrorDetails } from '@/components/ErrorBoundary';
import { useDispatch } from 'react-redux';
import { clearCanvas, undo } from '@/lib/store/slices/editorSlice';

// ============ CANVAS ERROR BOUNDARY ============

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Error Boundary especializado para el Canvas
 * Ofrece opciones de recuperación específicas del editor
 */
export function CanvasErrorBoundary({ children }: CanvasErrorBoundaryProps) {
  const dispatch = useDispatch();

  const handleError = useCallback((error: ErrorDetails) => {
    console.error('[CanvasError]', error.message);
    // Aquí se podría enviar a un servicio de analytics
  }, []);

  const fallback = useCallback((error: ErrorDetails, retry: () => void) => (
    <CanvasErrorFallback
      error={error}
      onRetry={retry}
      onUndo={() => {
        dispatch(undo());
        retry();
      }}
      onClear={() => {
        if (confirm('¿Limpiar todo el canvas? Esta acción no se puede deshacer.')) {
          dispatch(clearCanvas());
          retry();
        }
      }}
    />
  ), [dispatch]);

  return (
    <ErrorBoundary
      context="Canvas"
      onError={handleError}
      fallback={fallback}
      recoverable
    >
      {children}
    </ErrorBoundary>
  );
}

interface CanvasErrorFallbackProps {
  error: ErrorDetails;
  onRetry: () => void;
  onUndo: () => void;
  onClear: () => void;
}

function CanvasErrorFallback({ error, onRetry, onUndo, onClear }: CanvasErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-100 p-8">
      <div className="text-5xl mb-4">🎨</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Error en el Canvas
      </h2>
      <p className="text-gray-600 text-center max-w-md mb-6">
        Ha ocurrido un error al renderizar el canvas.
        Esto puede deberse a un elemento corrupto.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Reintentar
        </button>
        <button
          onClick={onUndo}
          className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
        >
          Deshacer último cambio
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
        >
          Limpiar canvas
        </button>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 w-full max-w-lg">
          <summary className="cursor-pointer text-sm text-gray-500">
            Detalles del error
          </summary>
          <pre className="mt-2 p-3 bg-gray-800 text-red-400 rounded text-xs overflow-auto">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}
    </div>
  );
}

// ============ LAYER ERROR BOUNDARY ============

interface LayerErrorBoundaryProps {
  children: ReactNode;
  layerId: string;
  layerName: string;
}

/**
 * Error Boundary para capas individuales
 * Permite que otras capas sigan funcionando si una falla
 */
export function LayerErrorBoundary({ children, layerId, layerName }: LayerErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context={`Layer:${layerName}`}
      fallback={
        <LayerErrorFallback layerName={layerName} />
      }
      recoverable
    >
      {children}
    </ErrorBoundary>
  );
}

function LayerErrorFallback({ layerName }: { layerName: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-100/80 pointer-events-none">
      <div className="bg-white px-4 py-2 rounded-lg shadow-md text-sm text-red-600">
        Error en capa: {layerName}
      </div>
    </div>
  );
}

// ============ TOOLBAR ERROR BOUNDARY ============

interface ToolbarErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Error Boundary para la barra de herramientas
 */
export function ToolbarErrorBoundary({ children }: ToolbarErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context="Toolbar"
      fallback={
        <div className="flex items-center justify-center h-full bg-gray-200 p-2">
          <span className="text-sm text-gray-600">
            Error en toolbar -
            <button
              onClick={() => window.location.reload()}
              className="ml-2 text-indigo-600 hover:underline"
            >
              Recargar
            </button>
          </span>
        </div>
      }
      recoverable
    >
      {children}
    </ErrorBoundary>
  );
}

// ============ PANEL ERROR BOUNDARY ============

interface PanelErrorBoundaryProps {
  children: ReactNode;
  panelName: string;
}

/**
 * Error Boundary genérico para paneles
 */
export function PanelErrorBoundary({ children, panelName }: PanelErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context={`Panel:${panelName}`}
      fallback={
        <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50">
          <span className="text-2xl mb-2">📋</span>
          <p className="text-sm text-gray-600 text-center">
            Error cargando {panelName}
          </p>
        </div>
      }
      recoverable
    >
      {children}
    </ErrorBoundary>
  );
}

// ============ ELEMENT ERROR BOUNDARY ============

interface ElementErrorBoundaryProps {
  children: ReactNode;
  elementId: string;
  elementType: string;
  onRemoveElement?: (id: string) => void;
}

/**
 * Error Boundary para elementos individuales del canvas
 * Permite que otros elementos sigan renderizando si uno falla
 */
export function ElementErrorBoundary({
  children,
  elementId,
  elementType,
  onRemoveElement
}: ElementErrorBoundaryProps) {
  const fallback = useCallback((error: ErrorDetails, retry: () => void) => (
    <ElementErrorFallback
      elementId={elementId}
      elementType={elementType}
      onRetry={retry}
      onRemove={onRemoveElement ? () => onRemoveElement(elementId) : undefined}
    />
  ), [elementId, elementType, onRemoveElement]);

  return (
    <ErrorBoundary
      context={`Element:${elementType}:${elementId.slice(0, 8)}`}
      fallback={fallback}
      recoverable
    >
      {children}
    </ErrorBoundary>
  );
}

interface ElementErrorFallbackProps {
  elementId: string;
  elementType: string;
  onRetry: () => void;
  onRemove?: () => void;
}

function ElementErrorFallback({ elementType, onRetry, onRemove }: ElementErrorFallbackProps) {
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={100}
        height={50}
        fill="rgba(255,0,0,0.1)"
        stroke="red"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <text x={50} y={25} textAnchor="middle" fill="red" fontSize={10}>
        Error: {elementType}
      </text>
    </g>
  );
}

// ============ ASYNC ERROR BOUNDARY (for Suspense) ============

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}

/**
 * Combina Suspense + ErrorBoundary para componentes async
 */
export function AsyncBoundary({
  children,
  fallback = <LoadingFallback />,
  errorFallback
}: AsyncBoundaryProps) {
  return (
    <ErrorBoundary
      context="AsyncComponent"
      fallback={errorFallback}
      recoverable
    >
      <React.Suspense fallback={fallback}>
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}
