import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react", "googleapis", "openai", "@google/generative-ai", "react-quill-new"],
  },
};

export default nextConfig;
