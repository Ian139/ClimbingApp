const path = require('path');

// ── Force mobile's node_modules for tailwindcss (v3) resolution ──
// NativeWind needs tailwindcss v3 but the monorepo root has v4.
// This patch ensures ALL requires of tailwindcss (including from
// PostCSS/NativeWind internals) resolve to mobile's copy.
const mobileNodeModules = path.resolve(__dirname, 'node_modules');

// Set NODE_PATH so any child processes also prefer mobile's modules
process.env.NODE_PATH = mobileNodeModules + ':' + (process.env.NODE_PATH || '');
require('module').Module._initPaths();

const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  // Force tailwindcss and postcss-related requires to mobile's node_modules
  if (
    request === 'tailwindcss' ||
    request.startsWith('tailwindcss/') ||
    request === 'postcss' ||
    request.startsWith('postcss/')
  ) {
    try {
      return originalResolveFilename.call(this, request, parent, isMain, {
        ...options,
        paths: [mobileNodeModules],
      });
    } catch { /* fall through */ }
  }
  try {
    return originalResolveFilename.call(this, request, parent, isMain, options);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return originalResolveFilename.call(this, request, parent, isMain, {
        ...options,
        paths: [mobileNodeModules, ...(options?.paths || [])],
      });
    }
    throw err;
  }
};

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch the shared package — nothing else outside projectRoot
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/shared'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Block root's react to prevent duplicate copies.
// Block root's tailwindcss to prevent v4 from being picked up.
const escRoot = monorepoRoot.replace(/[/\\]/g, '[/\\\\]');
config.resolver.blockList = [
  /\.next\/.*/,
  /\.git\/.*/,
  new RegExp(`${escRoot}[/\\\\]node_modules[/\\\\]react[/\\\\](?!native)`),
  new RegExp(`${escRoot}[/\\\\]node_modules[/\\\\]tailwindcss[/\\\\]`),
];

// Disable watchman — can cause hangs in monorepos
config.resolver.useWatchman = false;

module.exports = withNativeWind(config, {
  input: './global.css',
  configPath: './tailwind.config.js',
});
