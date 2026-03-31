import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize better-sqlite3 - it's a native module that can't run on Vercel
  serverExternalPackages: ["better-sqlite3"],

  // Ensure images from Spotify CDN work
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
  },
};

export default nextConfig;
