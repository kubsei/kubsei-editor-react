import type { NextConfig } from "next";

// kubsei-gateway origin: the browser calls it directly (REST auth + GraphQL), so CSP must allow it
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").origin;

// Security headers configuration
const securityHeaders = [
  // Prevent XSS attacks
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Permissions Policy (formerly Feature-Policy)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Strict Transport Security (HSTS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} https: wss:`,
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Enable React Compiler
  reactCompiler: true,

  // Output standalone for Docker
  output: "standalone",

  // Disable x-powered-by header
  poweredByHeader: false,

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: process.env.DOCKER_BUILD === "true",
  },

  // Experimental security features
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
