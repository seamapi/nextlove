// This file changes the routing to allow top-level prefixes

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        // Nextjs by default requires a /api prefix, let's remove that
        // {
        //   source: "/:path*",
        //   destination: "/api/:path*",
        // },
      ],
    }
  },
}

module.exports = nextConfig
