// next.config.mjs
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// serverActions allowedOrigins — comma-separated list from env. Defaults empty so
// cross-origin server-action invocations are rejected unless explicitly allowed.
const serverActionOrigins = (process.env.NEXT_SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);

// Strict Content-Security-Policy. Tighten further (nonces, hashes) as inline script usage is
// audited. We deliberately avoid 'unsafe-inline' for scripts wherever possible.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://accounts.google.com",
  "frame-src https://accounts.google.com",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests"
].join("; ");

/** @type {import('next').NextConfig} */
const baseConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: serverActionOrigins.length > 0 ? { allowedOrigins: serverActionOrigins } : {}
  },
  images: {
    // Only the hostnames we actually serve images from. No wildcard *.cloudfront.net or
    // *.akamaihd.net — any attacker can publish under those.
    remotePatterns: [
      { protocol: "https", hostname: "thevision.com" },
      { protocol: "https", hostname: "*.thevision.com" },
      { protocol: "https", hostname: "thevision-media.s3.eu-south-1.amazonaws.com" },

      { protocol: "https", hostname: "*.ansa.it" },

      { protocol: "https", hostname: "*.adnkronos.com" },
      { protocol: "https", hostname: "cdn.adnkronos.com" },

      { protocol: "https", hostname: "*.ilpost.it" },
      { protocol: "https", hostname: "static.ilpost.it" },
      { protocol: "https", hostname: "static-prod.cdnilpost.com" },

      { protocol: "https", hostname: "*.internazionale.it" },

      { protocol: "https", hostname: "*.res.24o.it" }
    ]
  },
  // Security headers applied to every frontend response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
        ]
      }
    ];
  }
};

export default withNextIntl(baseConfig);
