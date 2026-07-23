const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add 'wasm' to asset extensions so Metro resolves the wa-sqlite WebAssembly file
config.resolver.assetExts.push('wasm');

// Allow Metro to bundle .mbtiles files as binary assets (used by the native MapLibre build)
config.resolver.assetExts.push('mbtiles');

// Add headers required for SharedArrayBuffer to work on the web (for synchronous SQLite)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
