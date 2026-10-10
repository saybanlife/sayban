const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: false,
  skipWaiting: false
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true
  },
  trailingSlash: true,
  // Heavy Plasmic panel routes can exceed the default 60s on slower machines.
  staticPageGenerationTimeout: 300
};

module.exports = withPWA(nextConfig);
