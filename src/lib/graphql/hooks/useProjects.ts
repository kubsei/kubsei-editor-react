import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { graphqlClient } from "../client";
import {
  GET_PROJECTS,
  GET_PROJECT,
  CREATE_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  SAVE_PROJECT_STATE,
} from "../queries/project";
import type { CanvasElement, Layer } from "@/types/editor";

// Types
export interface Project {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetails extends Project {
  canvas: {
    width: number;
    height: number;
    zoom: number;
  };
  elements: Record<string, CanvasElement>;
  layers: Layer[];
}

export interface CreateProjectInput {
  name: string;
  canvas?: {
    width?: number;
    height?: number;
  };
}

export interface UpdateProjectInput {
  name?: string;
}

export interface ProjectStateInput {
  canvas: unknown;
  elements: unknown;
  layers: unknown;
}

// Query Keys
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (filters: string) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, "detail"] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Hooks
export const useProjects = () => {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const data = await graphqlClient.request<{ projects: Project[] }>(GET_PROJECTS);
      return data.projects;
    },
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const data = await graphqlClient.request<{ project: ProjectDetails }>(
        GET_PROJECT,
        { id }
      );
      return data.project;
    },
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const data = await graphqlClient.request<{ createProject: Project }>(
        CREATE_PROJECT,
        { input }
      );
      return data.createProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProjectInput }) => {
      const data = await graphqlClient.request<{ updateProject: Project }>(
        UPDATE_PROJECT,
        { id, input }
      );
      return data.updateProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await graphqlClient.request<{ deleteProject: boolean }>(
        DELETE_PROJECT,
        { id }
      );
      return data.deleteProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useSaveProjectState = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, state }: { id: string; state: ProjectStateInput }) => {
      const data = await graphqlClient.request<{ saveProjectState: Project }>(
        SAVE_PROJECT_STATE,
        { id, state }
      );
      return data.saveProjectState;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.id) });
    },
  });
};
