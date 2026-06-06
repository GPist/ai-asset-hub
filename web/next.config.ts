import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Allow images from the Gitea instance
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
