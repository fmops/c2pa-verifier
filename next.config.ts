import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Enable if you need to serve from a sub-path
  // basePath: '/c2pa-verifier',
  serverExternalPackages: ["sharp", "c2pa-node"]
};

export default nextConfig;
