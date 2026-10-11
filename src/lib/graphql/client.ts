// GraphQL client configuration for backend integration
import { API_URL, getAccessToken, refreshSession } from "@/lib/api/authService";
import { ApiError } from "@/lib/api/errors";

const GRAPHQL_ENDPOINT = `${API_URL}/graphql`;

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

export class GraphQLClient {
  private endpoint: string;

  constructor(endpoint: string = GRAPHQL_ENDPOINT) {
    this.endpoint = endpoint;
  }

  private getHeaders(token: string | null): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  async request<T = unknown, V = Record<string, unknown>>(
    query: string,
    variables?: V
  ): Promise<T> {
    const send = (token: string | null) =>
      fetch(this.endpoint, {
        method: "POST",
        headers: this.getHeaders(token),
        body: JSON.stringify({
          query,
          variables,
        }),
      });

    let response = await send(getAccessToken());

    // The gateway answers 401 to an expired access token: refresh once and retry
    if (response.status === 401) {
      const newToken = await refreshSession();
      if (newToken) {
        response = await send(newToken);
      }
    }

    if (!response.ok) {
      throw new ApiError(`HTTP_${response.status}`, `HTTP ${response.status}`);
    }

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      // kubsei-editor classifies its errors: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INTERNAL_ERROR...
      const code = String(result.errors[0].extensions?.classification ?? "INTERNAL_ERROR");
      throw new ApiError(code, result.errors.map((e) => e.message).join(", "));
    }

    return result.data as T;
  }
}

export const graphqlClient = new GraphQLClient();

export default graphqlClient;
