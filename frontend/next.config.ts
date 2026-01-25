import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname, // tell turbopack to use frontend folder as root
  },
};

export default nextConfig;
