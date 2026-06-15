/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly opt in to React strict mode to surface double-render bugs early.
  reactStrictMode: true,

  // ESLint runs during `next build`; fail the build on any lint error.
  eslint: {
    ignoreDuringBuilds: false,
  },

  // TypeScript type errors also fail the build (default, but explicit for clarity).
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
