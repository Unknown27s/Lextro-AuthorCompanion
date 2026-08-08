const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Register .gz / .wasm as bundled assets so Asset.fromModule(require(...)) works
config.resolver.assetExts.push('gz', 'wasm');

module.exports = config;
