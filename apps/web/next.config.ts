import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@bgpmassa/shared"],
};

export default nextConfig;
