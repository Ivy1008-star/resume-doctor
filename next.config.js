/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sql.js ships a WASM glue module that must NOT be bundled by webpack
  // (bundling breaks its module.exports shim). Load it at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['sql.js'],
  },
}

module.exports = nextConfig
