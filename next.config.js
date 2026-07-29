/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // sql.js ships a WASM glue module that must NOT be bundled by webpack
  // (bundling breaks its module.exports shim). Load it at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['sql.js'],
  },
  // On the Edge runtime (Cloudflare Pages via next-on-pages) the `node:*`
  // builtins are provided at runtime by the `nodejs_compat` flag. Webpack's
  // edge target otherwise throws "Unhandled scheme" for `node:crypto`, so we
  // mark those builtins external and let the runtime resolve them.
  webpack: (config, { nextRuntime }) => {
    // Mark node:* builtins external for ALL webpack compilations (edge,
    // nodejs/RSC, and dynamically-loaded chunks). Without this, the edge
    // sandbox rejects "Native module not found: node:crypto" and the RSC
    // build throws "A dynamic import callback was not specified".
    const builtins = ['crypto', 'buffer', 'events', 'util', 'stream', 'async_hooks']
    const externals = {}
    for (const name of builtins) {
      externals[`node:${name}`] = `commonjs node:${name}`
    }
    config.externals = Array.isArray(config.externals)
      ? [...config.externals, externals]
      : [config.externals, externals].filter(Boolean)
    return config
  },
}

module.exports = nextConfig
