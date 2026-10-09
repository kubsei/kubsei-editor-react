// GraphQL queries for project operations
// These will be used with TanStack Query hooks

export const GET_PROJECTS = `
  query GetProjects {
    projects {
      id
      name
      thumbnail
      createdAt
      updatedAt
    }
  }
`;

export const GET_PROJECT = `
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      canvas {
        width
        height
        zoom
      }
      elements
      layers {
        id
        name
        visible
        locked
        opacity
        elements
      }
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_PROJECT = `
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      createdAt
    }
  }
`;

export const UPDATE_PROJECT = `
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      updatedAt
    }
  }
`;

export const DELETE_PROJECT = `
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const SAVE_PROJECT_STATE = `
  mutation SaveProjectState($id: ID!, $state: ProjectStateInput!) {
    saveProjectState(id: $id, state: $state) {
      id
      updatedAt
    }
  }
`;
