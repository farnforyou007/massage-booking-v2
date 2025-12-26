// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   /* config options here */
//   output: "standalone",
//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   reactCompiler: true,
//   images: {
//     domains: ['profile.line-scdn.net'],
//   },
// };

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: "standalone", // ✅ 1. เพิ่มบรรทัดนี้ (สำคัญมากสำหรับ Docker)
  reactCompiler: true,
  images: {
    domains: ['profile.line-scdn.net'],
  },
  eslint: {
    ignoreDuringBuilds: true, // ✅ 2. เพิ่มบรรทัดนี้ (เพื่อข้ามการตรวจ Error เล็กน้อยตอน Build)
  },
};

export default nextConfig;