/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: "standalone",
  reactCompiler: true,
  images: {
    domains: ['profile.line-scdn.net'],
  },
};

export default nextConfig;
