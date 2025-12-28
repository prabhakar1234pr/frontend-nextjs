import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    // Enable React Compiler for automatic memoization (Next.js 16)
    reactCompiler: true,
    // Optimize package imports for better tree-shaking
    optimizePackageImports: ['@clerk/nextjs'],
  },
  
  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Enable SWC minification (faster than Terser) - enabled by default in Next.js 16
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
