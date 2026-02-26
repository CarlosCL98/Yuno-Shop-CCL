import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize compilation
  typescript: {
    // Speed up type checking in dev mode
    tsconfigPath: './tsconfig.json',
  },
  // Optimize images
  images: {
    unoptimized: true, // For development
  },
  // Reduce memory usage and optimize imports
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js'],
  },
};

export default nextConfig;
