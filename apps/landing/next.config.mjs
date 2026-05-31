/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Standalone output for a small, self-contained container image (mirrors
  // apps/web). The Docker runner copies .next/standalone + static + public +
  // the content/ corpus so SSG and any on-demand render both work.
  output: 'standalone',
  transpilePackages: ['@kit/ui'],
  typescript: { ignoreBuildErrors: true },
  experimental: {
    optimizePackageImports: ['@kit/ui', 'lucide-react', '@codesandbox/sandpack-react'],
  },
};

export default config;
