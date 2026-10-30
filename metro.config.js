const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignore EdenFS / Sapling stub dirs. Metro's file watcher tries to watch
// every folder and crashes with ENOENT on these empty stubs on Windows.
config.resolver.blockList.push(/\.eden([\\/].*)?$/, /\.hg([\\/].*)?$/, /\.sl([\\/].*)?$/);

module.exports = config;
