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
  async rewrites() {
    // In production (Docker Compose), the API container is accessible as "api:3001"
    // In local dev, set INTERNAL_API_URL=http://localhost:3001 in .env.local
    const apiBase = process.env.INTERNAL_API_URL || "http://api:3001";
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${apiBase}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
