/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Turned off for simpler WebSocket handling in dev
  turbopack: {
    root: './src', 
  },
  async rewrites() {
    const providerUrl = process.env.PROVIDER_URL || 'http://localhost:8000';
    return [
      {
        source: '/provider/:path*',
        destination: `${providerUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
