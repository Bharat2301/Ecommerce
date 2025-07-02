const nextConfig = {
  experimental: {
    // Remove appDir as it's no longer needed in Next.js 13+
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
};

module.exports = nextConfig;