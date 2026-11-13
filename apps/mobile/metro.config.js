const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const corePackageRoot = path.resolve(monorepoRoot, 'packages/core');

/**
 * Metro configuration for monorepo setup:
 * 1. watchFolders: monorepo root and packages/core
 * 2. resolver.nodeModulesPaths: mobile node_modules and root node_modules
 * 3. extraNodeModules: ensures single copy of react & react-native and resolves @socialparse/core
 * 4. resolveRequest: stubs out Node.js built-ins (node:fs/promises, node:path, node:crypto)
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [monorepoRoot, corePackageRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@socialparse/core': corePackageRoot,
      '@smp/core': corePackageRoot,
      react: path.resolve(monorepoRoot, 'node_modules/react'),
      'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
    },
    blockList: [
      // Prevent Metro from resolving duplicate copies of react & react-native if installed locally
      new RegExp(`^${path.resolve(projectRoot, 'node_modules/react')}/.*`),
      new RegExp(`^${path.resolve(projectRoot, 'node_modules/react-native')}/.*`),
    ],
    resolveRequest: (context, moduleName, platform) => {
      // Stub Node-only modules imported conditionally by @socialparse/core/node-fs
      if (
        moduleName.startsWith('node:') ||
        ['fs', 'path', 'crypto', 'node:fs/promises', 'node:path', 'node:crypto'].includes(moduleName)
      ) {
        return {
          type: 'empty',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
