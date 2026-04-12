import type { NextConfig } from "next";

const backendOrigin = process.env.APIHUB_BACKEND_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`
      },
      {
        source: "/mock/:path*",
        destination: `${backendOrigin}/mock/:path*`
      }
    ];
  }
};

export default nextConfig;
