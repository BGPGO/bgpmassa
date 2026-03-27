/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  output: "standalone",
  transpilePackages: ["@bgpmassa/shared"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
