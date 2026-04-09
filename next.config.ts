import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize font loading
  optimizeFonts: true,
  
  // Add logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Ensure proper static file handling
  experimental: {
    turbo: {
      // Add turbopack config if needed
    },
  },
};

export default nextConfig;
