import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rate limiting configuration (simple in-memory, use Redis in production)
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // requests per window

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown";
  return ip;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimit.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Skip static files and API routes for rate limiting
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Rate limiting for non-static routes
  const rateLimitKey = getRateLimitKey(request);
  const { allowed, remaining } = checkRateLimit(rateLimitKey);

  if (!allowed) {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        "Retry-After": "60",
        "X-RateLimit-Limit": MAX_REQUESTS.toString(),
        "X-RateLimit-Remaining": "0",
      },
    });
  }

  // Add rate limit headers
  response.headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());

  // Auth is checked client-side (ProtectedRoute): tokens live in localStorage, which the server cannot see

  // Security headers for all routes (additional to next.config.ts)
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
