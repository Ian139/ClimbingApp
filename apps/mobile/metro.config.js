const path = require('path');

// Fix hoisted package resolution (see monorepo-gotchas.md)
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
const mobileNodeModules = path.resolve(__dirname, 'node_modules');

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'tailwindcss' || request.startsWith('tailwindcss/')) {
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
// Root has react@19.2.3, mobile has react@19.1.0 (matched to RN 0.81).
// Without this, Metro loads both → "Invalid hook call" crash.
const escRoot = monorepoRoot.replace(/[/\\]/g, '[/\\\\]');
config.resolver.blockList = [
  /\.next\/.*/,
  /\.git\/.*/,
  new RegExp(`${escRoot}[/\\\\]node_modules[/\\\\]react[/\\\\](?!native)`),
];

// Disable watchman — can cause hangs in monorepos
config.resolver.useWatchman = false;

// TODO: Re-enable NativeWind once bundling is stable
// module.exports = withNativeWind(config, {
//   input: './global.css',
//   configPath: './tailwind.config.ts',
// });
module.exports = config;
