import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultConfig, mergeConfig } from '@react-native/metro-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = {
  // Let Metro see changes in shared packages (e.g. packages/core)
  watchFolders: [monorepoRoot],
  resolver: {
    // Look in the app's node_modules first, then the root node_modules
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
  },
};

export default mergeConfig(getDefaultConfig(projectRoot), config);
