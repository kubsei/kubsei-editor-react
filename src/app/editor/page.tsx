"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import Konva from "konva";
import StoreProvider from "@/lib/store/StoreProvider";
import CanvasVisualizer, { CanvasVisualizerRef } from "@/components/app/editor/CanvasVisualizer";
import Toolbar from "@/components/app/editor/Toolbar";
import ProfileToolbar from "@/components/app/editor/ProfileToolbar";
import AiFancyLoader from "@/components/app/editor/ai/AiFancyLoader";
import { LayersPanel } from "@/components/app/editor/layers-panel";
import { ProtectedRoute } from "@/components/auth";
import { useProject } from "@/lib/graphql/hooks/useProjects";
import { restoreProject } from "@/lib/store/slices/editorSlice";
import { Loader2 } from "lucide-react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SyncStatusIndicator } from "@/components/app/editor/SyncStatusIndicator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  CanvasErrorBoundary,
  ToolbarErrorBoundary,
  PanelErrorBoundary,
} from "@/components/app/editor/errors";
import { setupGlobalErrorHandlers, addBreadcrumb } from "@/lib/errors";

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-neutral-950">
    <Loader2 className="h-8 w-8 animate-spin text-white" />
  </div>
);

const EditorContent = () => {
  const canvasRef = useRef<CanvasVisualizerRef>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const projectId = searchParams.get("project");
  const { data: project, isLoading: isLoadingProject } = useProject(projectId || "");
  const [hasInitialized, setHasInitialized] = useState(false);

  // Hook de auto-save con dirty flags
  const { retryNow } = useAutoSave({
    projectId: projectId || "",
    enabled: hasInitialized && !!projectId,
  });

  // Setup global error handlers
  useEffect(() => {
    setupGlobalErrorHandlers();
    addBreadcrumb('navigation', 'Editor page loaded');
  }, []);

  // Redirect if no project ID
  useEffect(() => {
    if (!projectId) {
      router.push("/workspace");
    }
  }, [projectId, router]);

  // Load project data into editor
  useEffect(() => {
    if (project && !hasInitialized) {
      console.log("[Editor] Loading project:", project.id);
      dispatch(restoreProject({
        canvas: {
          width: project.canvas?.width || 1920,
          height: project.canvas?.height || 1080,
          zoom: project.canvas?.zoom || 0.5,
          offsetX: 0,
          offsetY: 0,
        },
        elements: project.elements || {},
        layers: project.layers || [],
      }));
      setHasInitialized(true);
    }
  }, [project, dispatch, hasInitialized]);

  // Create a ref object that ProfileToolbar can use
  const stageRef = {
    get current() {
      return canvasRef.current?.getStage() ?? null;
    },
  };

  // Show loading state while project loads
  if (isLoadingProject || !hasInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white/70">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-950">
      {/* Sync Status Indicator - Top center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <SyncStatusIndicator onRetry={retryNow} />
      </div>

      {/* Canvas area - Con Error Boundary especializado */}
      <CanvasErrorBoundary>
        <CanvasVisualizer ref={canvasRef} />
      </CanvasErrorBoundary>

      {/* Floating Toolbar - Con Error Boundary */}
      <ToolbarErrorBoundary>
        <Toolbar />
      </ToolbarErrorBoundary>

      {/* Layers Panel - Con Error Boundary */}
      <PanelErrorBoundary panelName="Capas">
        <LayersPanel />
      </PanelErrorBoundary>

      {/* Profile Toolbar - Top Right */}
      <ErrorBoundary context="ProfileToolbar" recoverable>
        <ProfileToolbar stageRef={stageRef as React.RefObject<Konva.Stage | null>} />
      </ErrorBoundary>

      {/* AI Loader - Fixed in bottom right */}
      <div className="fixed bottom-8 right-10 z-50 cursor-pointer">
        <AiFancyLoader size={0.5} speed={3} />
      </div>
    </div>
  );
};

// Inner component that wraps everything with Store
const EditorInner = () => {
  return (
    <ErrorBoundary context="EditorPage" isolationLevel="page" recoverable>
      <ProtectedRoute>
        <StoreProvider>
          <EditorContent />
        </StoreProvider>
      </ProtectedRoute>
    </ErrorBoundary>
  );
};

// Main component with Suspense boundary at the top level
// This is required because ProtectedRoute and EditorContent both use useSearchParams
const Editor = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EditorInner />
    </Suspense>
  );
};

export default Editor;
