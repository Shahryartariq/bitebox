import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Google hosts are only here so optional analytics and ads work when their env vars are set.
const google = {
  script: [
    "https://www.googletagmanager.com",
    "https://pagead2.googlesyndication.com",
    "https://*.adtrafficquality.google",
  ],
  connect: [
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
    "https://pagead2.googlesyndication.com",
    "https://*.adtrafficquality.google",
  ],
  frame: [
    "https://googleads.g.doubleclick.net",
    "https://tpc.googlesyndication.com",
    "https://www.google.com",
    "https://*.adtrafficquality.google",
  ],
};

// Pages are statically rendered and cached, so a per-request nonce isn't possible;
// inline scripts are limited to Next's own bootstrap and the theme script.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${google.script.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  // Imported recipes show the publisher's own photo, which can live on any https host.
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src 'self' ${google.connect.join(" ")}`,
  `frame-src ${google.frame.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["undici"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
