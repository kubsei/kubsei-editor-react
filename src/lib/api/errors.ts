/**
 * A backend error with a stable code: kubsei-users' ProblemDetail "code", kubsei-editor's GraphQL
 * extensions.classification, or HTTP_<status> when there is neither. message keeps the server text for logs.
 */
export class ApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

const KEYS: Record<string, string> = {
  INVALID_CREDENTIALS: "auth.errors.invalidCredentials",
  USE_PROVIDER: "auth.errors.useProvider",
  ACCOUNT_DISABLED: "auth.errors.accountDisabled",
  EMAIL_TAKEN: "auth.errors.emailTaken",
  SESSION_EXPIRED: "errors.authRequired.message",
  UNAUTHORIZED: "errors.authRequired.message",
  HTTP_401: "errors.authRequired.message",
  FORBIDDEN: "errors.forbidden",
  HTTP_403: "errors.forbidden",
  NOT_FOUND: "errors.notFound",
  HTTP_404: "errors.notFound",
  BAD_REQUEST: "errors.validation",
  HTTP_400: "errors.validation",
};

/** Translation key for anything thrown by an API call: users see this, never the server's English text. */
export const errorKey = (err: unknown): string => {
  if (err instanceof ApiError) return KEYS[err.code] ?? "errors.server";
  // fetch rejects with a TypeError when the request never got a response (offline, DNS, CORS)
  if (err instanceof TypeError) return "errors.network";
  return "errors.server";
};
