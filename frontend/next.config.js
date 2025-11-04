/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Set the pages directory to src/pages
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },

  // TypeScript configuration
  typescript: {
    // Type-checking is enforced during build
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Linting is enforced during build
    ignoreDuringBuilds: false,
  },

  // Experimental features
  experimental: {
    // Enable server actions if needed
  },

  // Webpack configuration to exclude test files
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      loader: 'ignore-loader'
    });
    // Exclude test directories from compilation
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/test/**', '**/tests/**', '**/*.test.*', '**/*.spec.*']
    };
    return config;
  },
};

export default nextConfig;
