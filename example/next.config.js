// This file changes the routing to allow top-level prefixes

module.exports = {
  async rewrites() {
    return {
      beforeFiles: [
        // Nextjs by default requires a /api prefix, let's remove that
        {
          source: "/:path*",
          destination: "/api/:path*",
        },
      ],
    }
  },
}
