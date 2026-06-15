import { withSentryConfig } from "@sentry/nextjs";

const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrlRaw) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL is required at build time for next/image remotePatterns"
  );
}

const supabaseUrl = new URL(supabaseUrlRaw);
const isLocalSupabase =
  supabaseUrl.hostname === "127.0.0.1" || supabaseUrl.hostname === "localhost";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Turbopack's font downloader bundles its own CA roots and ignores the
    // system trust store. Behind a TLS-intercepting egress proxy (some CI /
    // agent environments), that breaks the next/font/google fetch during
    // `next build` even when the domain is reachable. Use system certificates
    // so the proxy CA is trusted. No-op on hosts with a normal trust chain.
    turbopackUseSystemTlsCerts: true,
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  // Cache Components: dynamic-by-default + PPR. `use cache` functions
  // prerender into a static shell; uncached/cookie reads stream in behind
  // Suspense boundaries.
  cacheComponents: true,
  images: {
    dangerouslyAllowLocalIP: isLocalSupabase,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: supabaseUrl.protocol.replace(":", ""),
        hostname: supabaseUrl.hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "odd-corp",

  project: "claude-hunt",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
