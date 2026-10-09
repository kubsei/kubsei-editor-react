"use client";

import type { AuthResponse, User, LoginRequest, RegisterRequest } from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const GRAPHQL_URL = `${API_URL}/graphql`;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  if (!result.data) {
    throw new Error("No data returned from server");
  }

  return result.data;
}

// Mutations
const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      tokenType
      user {
        id
        email
        name
        avatarUrl
        roles
        provider
        emailVerified
        createdAt
        lastLoginAt
      }
    }
  }
`;

const REGISTER_MUTATION = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      tokenType
      user {
        id
        email
        name
        avatarUrl
        roles
        provider
        emailVerified
        createdAt
        lastLoginAt
      }
    }
  }
`;

const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
      tokenType
      user {
        id
        email
        name
        avatarUrl
        roles
        provider
        emailVerified
        createdAt
        lastLoginAt
      }
    }
  }
`;

const LOGOUT_MUTATION = `
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

// Queries
const ME_QUERY = `
  query Me {
    me {
      id
      email
      name
      avatarUrl
      roles
      provider
      emailVerified
      createdAt
      lastLoginAt
    }
  }
`;

// Auth Service Functions
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const data = await graphqlRequest<{ login: AuthResponse }>(LOGIN_MUTATION, {
    input: credentials,
  });
  return data.login;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await graphqlRequest<{ register: AuthResponse }>(
    REGISTER_MUTATION,
    { input: data }
  );
  return response.register;
}

export async function refreshToken(token: string): Promise<AuthResponse> {
  const data = await graphqlRequest<{ refreshToken: AuthResponse }>(
    REFRESH_TOKEN_MUTATION,
    { input: { refreshToken: token } }
  );
  return data.refreshToken;
}

export async function logout(refreshTokenValue: string): Promise<boolean> {
  const data = await graphqlRequest<{ logout: boolean }>(LOGOUT_MUTATION, {
    refreshToken: refreshTokenValue,
  });
  return data.logout;
}

export async function getMe(token: string): Promise<User> {
  const data = await graphqlRequest<{ me: User }>(ME_QUERY, {}, token);
  return data.me;
}

// Google OAuth URL
export function getGoogleOAuthUrl(): string {
  return `${API_URL}/oauth2/authorization/google`;
}
