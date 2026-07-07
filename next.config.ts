import type { NextConfig } from "next";

/**
 * Two modes:
 *  - Production build (`BUILD_STATIC=true npm run build`): emit a static SPA into
 *    `out/`. No Node server — nginx/Cloudflare serve the files, and nginx proxies
 *    `/api/v1` to the app on the same domain (first-party cookies).
 *  - Development (`npm run dev`): proxy `/api/v1/*` to the live backend so the
 *    browser talks to it same-origin locally. Static export forbids rewrites, so
 *    these two modes are mutually exclusive.
 */
const isStaticExport = process.env.BUILD_STATIC === "true";
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "https://tunashop.tuna-transfer.xyz";

const nextConfig: NextConfig = isStaticExport
  ? { output: "export" }
  : {
      async rewrites() {
        return [{ source: "/api/v1/:path*", destination: `${API_ORIGIN}/api/v1/:path*` }];
      },
    };

export default nextConfig;
