import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [{ source: "/mcp-auth/:path*", destination: "http://highfive-mcp-auth:8080/mcp-auth/:path*" }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "googleapis", "openai", "@google/generative-ai", "react-quill-new"],
  },
};

export default nextConfig;
