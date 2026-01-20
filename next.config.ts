import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/.prisma/client/**/*'],
  },
  // Add timeout for external resources like Google Fonts
  staticPageGenerationTimeout: 120,
};

export default nextConfig;