/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The browser talks to the Express API directly at NEXT_PUBLIC_API_URL
  // (https://taskmgr-api.arx-app.com:4116). No rewrites/proxying here.
  images: {
    // Only local assets are used (public/favicon.svg, inline SVGs).
    remotePatterns: [],
  },
  eslint: {
    // Linting is not part of the production build pipeline for this project.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;