import type { NextConfig } from "next";

const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api\/v1$/i, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
