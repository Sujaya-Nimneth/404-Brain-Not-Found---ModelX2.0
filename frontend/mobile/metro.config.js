const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedWebSrc = path.resolve(projectRoot, "../src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedWebSrc];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
];

module.exports = config;
