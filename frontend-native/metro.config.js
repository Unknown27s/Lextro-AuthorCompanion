const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Register .gz / .wasm / .txt as bundled assets so Asset.fromModule(require(...)) works
config.resolver.assetExts.push('gz', 'wasm', 'txt');

module.exports = config;
