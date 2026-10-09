// GraphQL client configuration for backend integration

const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/graphql`
  : "http://localhost:3001/graphql";

const TOKEN_KEY = "visual-editor-token";

interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>;
}

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

// Get token from localStorage
const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export class GraphQLClient {
  private endpoint: string;

  constructor(endpoint: string = GRAPHQL_ENDPOINT) {
    this.endpoint = endpoint;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    const token = getToken();
    console.log("[GraphQL Client] Token:", token ? `present (length: ${token.length})` : "null");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async request<T = unknown, V = Record<string, unknown>>(
    query: string,
    variables?: V
  ): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors.map((e) => e.message).join(", "));
    }

    return result.data as T;
  }
}

export const graphqlClient = new GraphQLClient();

export default graphqlClient;
