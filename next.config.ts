import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development', // Disable in dev to prevent reload issues
  register: true,
  skipWaiting: true,
  sw: '/sw.js',
  fallbacks: {
    document: '/offline.html'
  }
})

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply aggressive no-cache headers to ALL routes
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
