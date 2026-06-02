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
  // Cache Components: dynamic-by-default + PPR. `use cache` functions
  // prerender into a static shell; uncached/cookie reads stream in behind
  // Suspense boundaries.
  cacheComponents: true,
  // Wire navigation through React's View Transition integration so transitions
  // are explicit and controllable (transition types, per-element opt-out)
  // rather than firing implicitly. We scope the actual animation down to the
  // list reorder in globals.css by silencing the root (whole-page) group.
  experimental: {
    viewTransition: true,
  },
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

export default nextConfig;
