"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileImage,
  FolderOpen,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Trash2,
  Edit3,
  Copy,
  Clock,
  LogOut,
  Settings,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";
import useIntl from "@/hooks/useIntl";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  type Project,
} from "@/lib/graphql/hooks/useProjects";

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
  </div>
);

// Inner component that uses hooks requiring Suspense
const WorkspaceContent = () => {
  const router = useRouter();
  const { t } = useIntl();
  const { user, logout } = useAuth();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: "",
  });

  // GraphQL hooks
  const { data: projects = [], isLoading, error, refetch } = useProjects();
  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parseErrorMessage = (err: unknown): { title: string; message: string } => {
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (errorMessage.includes("Insufficient permissions") || errorMessage.includes("Required roles")) {
      return {
        title: t("errors.insufficientPermissions.title", { default: "Insufficient Permissions" }),
        message: t("errors.insufficientPermissions.message", {
          default: "You don't have permission to perform this action. Your account has a VIEWER role which only allows viewing projects. Please contact an administrator to upgrade your account to EDITOR role."
        }),
      };
    }

    if (errorMessage.includes("Authentication required")) {
      return {
        title: t("errors.authRequired.title", { default: "Authentication Required" }),
        message: t("errors.authRequired.message", { default: "Your session has expired. Please log in again." }),
      };
    }

    return {
      title: t("errors.generic.title", { default: "Error" }),
      message: errorMessage,
    };
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const newProject = await createProjectMutation.mutateAsync({
        name: newProjectName,
      });
      setNewProjectName("");
      setShowNewProjectModal(false);
      router.push(`/editor?project=${newProject.id}`);
    } catch (err) {
      console.error("Error creating project:", err);
      const { title, message } = parseErrorMessage(err);
      setShowNewProjectModal(false);
      setErrorModal({ show: true, title, message });
    }
  };

  const handleOpenProject = (projectId: string) => {
    router.push(`/editor?project=${projectId}`);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      setActiveMenu(null);
    } catch (err) {
      console.error("Error deleting project:", err);
      const { title, message } = parseErrorMessage(err);
      setActiveMenu(null);
      setErrorModal({ show: true, title, message });
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      await createProjectMutation.mutateAsync({
        name: `${project.name} (${t("workspace.project.duplicate", { default: "copy" })})`,
      });
      setActiveMenu(null);
    } catch (err) {
      console.error("Error duplicating project:", err);
      const { title, message } = parseErrorMessage(err);
      setActiveMenu(null);
      setErrorModal({ show: true, title, message });
    }
  };

  const handleLogout = () => {
    logout();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getProjectCount = () => {
    const count = projects.length;
    if (count === 1) {
      return t("workspace.projectCount", { default: "1 project" }).replace("{count}", "1");
    }
    return t("workspace.projectCountPlural", { default: `${count} projects` }).replace("{count}", String(count));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
                <span className="text-2xl font-bold text-black">
                  {t("common.brand.name", { default: "plaart" })}
                </span>
              </div>

              {/* Search */}
              <div className="flex-1 max-w-lg mx-8">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("workspace.search", { default: "Search projects..." })}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* User menu */}
              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                </motion.button>
                {/* User avatar */}
                <div className="flex items-center space-x-3">
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name || "User"}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Actions bar */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("workspace.title", { default: "My Projects" })}
              </h1>
              <p className="text-gray-500 mt-1">{getProjectCount()}</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* View toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-black"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-black"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* New project button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowNewProjectModal(true)}
                className="flex items-center space-x-2 bg-black text-white px-6 py-2.5 rounded-lg font-medium shadow-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>{t("workspace.newProject", { default: "New Project" })}</span>
              </motion.button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center py-16">
              <p className="text-red-500 mb-4">{t("errors.server", { default: "An error occurred" })}</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-black text-white rounded-lg cursor-pointer"
              >
                {t("common.retry", { default: "Retry" })}
              </button>
            </div>
          )}

          {/* Projects Grid/List */}
          {!isLoading && !error && (
            <>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-16">
                  <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery
                      ? t("workspace.noProjects.searchTitle", { default: "No projects found" })
                      : t("workspace.noProjects.title", { default: "No projects yet" })}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery
                      ? t("workspace.noProjects.searchDescription", { default: "Try a different search" })
                      : t("workspace.noProjects.description", { default: "Create your first project to start designing" })}
                  </p>
                  {!searchQuery && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowNewProjectModal(true)}
                      className="inline-flex items-center space-x-2 bg-black text-white px-6 py-3 rounded-lg font-medium cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                      <span>{t("workspace.modal.create", { default: "Create project" })}</span>
                    </motion.button>
                  )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProjects.map((project) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleOpenProject(project.id)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video bg-linear-to-br from-gray-100 to-gray-200 relative">
                        {project.thumbnail ? (
                          <Image
                            src={project.thumbnail}
                            alt={project.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FileImage className="w-12 h-12 text-gray-300" />
                          </div>
                        )}

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium cursor-pointer"
                          >
                            {t("workspace.project.open", { default: "Open" })}
                          </motion.button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-gray-500 flex items-center mt-1">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatDate(project.updatedAt)}
                            </p>
                          </div>

                          {/* Menu button */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenu(activeMenu === project.id ? null : project.id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>

                            {/* Dropdown menu */}
                            <AnimatePresence>
                              {activeMenu === project.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-10"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleOpenProject(project.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    {t("workspace.project.edit", { default: "Edit" })}
                                  </button>
                                  <button
                                    onClick={() => handleDuplicateProject(project)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center cursor-pointer"
                                  >
                                    <Copy className="w-4 h-4 mr-2" />
                                    {t("workspace.project.duplicate", { default: "Duplicate" })}
                                  </button>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => handleDeleteProject(project.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t("workspace.project.delete", { default: "Delete" })}
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* List view */
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {filteredProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        index !== 0 ? "border-t border-gray-100" : ""
                      }`}
                      onClick={() => handleOpenProject(project.id)}
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-12 bg-linear-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden">
                        {project.thumbnail ? (
                          <Image
                            src={project.thumbnail}
                            alt={project.name}
                            fill
                            className="object-cover rounded-lg"
                            unoptimized
                          />
                        ) : (
                          <FileImage className="w-6 h-6 text-gray-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 ml-4 min-w-0">
                        <h3 className="font-medium text-gray-900">{project.name}</h3>
                        <p className="text-sm text-gray-500">
                          {t("workspace.project.modified", { default: "Modified" }).replace("{date}", formatDate(project.updatedAt))}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateProject(project);
                          }}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* New Project Modal */}
        <AnimatePresence>
          {showNewProjectModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowNewProjectModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {t("workspace.modal.createTitle", { default: "Create new project" })}
                </h2>

                <div className="mb-6">
                  <label
                    htmlFor="projectName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t("workspace.modal.projectName", { default: "Project name" })}
                  </label>
                  <input
                    type="text"
                    id="projectName"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={t("workspace.modal.projectNamePlaceholder", { default: "My new project" })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !createProjectMutation.isPending) {
                        handleCreateProject();
                      }
                    }}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowNewProjectModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {t("common.cancel", { default: "Cancel" })}
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || createProjectMutation.isPending}
                    className="flex-1 px-4 py-3 bg-black text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
                  >
                    {createProjectMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t("workspace.modal.creating", { default: "Creating..." })}
                      </>
                    ) : (
                      t("workspace.modal.create", { default: "Create project" })
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Modal */}
        <AnimatePresence>
          {errorModal.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setErrorModal({ ...errorModal, show: false })}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-bold text-gray-900">
                        {errorModal.title}
                      </h2>
                      <button
                        onClick={() => setErrorModal({ ...errorModal, show: false })}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-gray-600 mt-2 text-sm">
                      {errorModal.message}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setErrorModal({ ...errorModal, show: false })}
                    className="px-6 py-2.5 bg-black text-white rounded-lg font-medium cursor-pointer"
                  >
                    {t("common.ok", { default: "OK" })}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
};

// Main component with Suspense boundary
// Required because useAuth uses useSearchParams
export default function WorkspacePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WorkspaceContent />
    </Suspense>
  );
}
