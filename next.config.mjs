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
