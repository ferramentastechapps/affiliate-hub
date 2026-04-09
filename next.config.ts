import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add logging for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Set correct workspace root
  outputFileTracingRoot: require('path').join(__dirname),
};

export default nextConfig;
