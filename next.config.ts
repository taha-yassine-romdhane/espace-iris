import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  // Add this output configuration
  output: 'standalone', // Required for Docker deployment
  // Keep your existing image config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '1q2z9d946v.ufs.sh',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Optional: Add transpilePackages if using Prisma
  transpilePackages: ['@prisma/client'],
};

export default nextConfig;