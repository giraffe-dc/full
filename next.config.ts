import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Disable some optimizations that can cause EPERM issues on Windows
    experimental: {
        // Reduce file system operations
        optimizePackageImports: [],
    },
    // Disable source maps in development to reduce file operations
    productionBrowserSourceMaps: false,
    // Turbopack configuration (Next.js 16 uses Turbopack by default)
    turbopack: {},
    // Webpack configuration (used when --webpack flag is explicitly passed)
    webpack: (config, { dev }) => {
        if (dev) {
            // Reduce file watching overhead on Windows
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
                ignored: /node_modules/,
            }
        }
        return config
    },
}

export default nextConfig;
