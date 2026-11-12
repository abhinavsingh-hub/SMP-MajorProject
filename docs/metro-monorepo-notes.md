# Metro configuration note for the monorepo

Metro is the bundler React Native uses. By default it only looks inside the app's own
folder, but in this monorepo npm installs packages in the ROOT `node_modules` and our
shared code lives in `packages/core`. Metro therefore needs to be told about the root.

**Status: note only.** No `metro.config.js` exists yet. It is created together with
`apps/mobile` and `apps/desktop` (React Native macOS).

## What to add when the apps are created

In each app's `metro.config.js`:

```js
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

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

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
```

## Things to watch out for

- Keep ONE copy of `react` and `react-native` (`react-native-macos` for desktop). Duplicate
  copies cause errors like "Invariant Violation" or hooks crashing. Check with `npm ls react`.
- Use the same `react` / `react-native` versions in `apps/mobile` and `apps/desktop`
  as far as the RN and RN macOS version pairing allows.
- The generated metro config of `react-native-macos` can differ from the plain RN template.
  Keep the template's content and just add `watchFolders` and `nodeModulesPaths`.
- After changing Metro config, restart it with a clean cache: `npx react-native start --reset-cache`.
- Check native build files (`android/settings.gradle`, `Podfile`) when the apps are created:
  they must find `node_modules` at the monorepo root, not only inside the app folder.
- Newer Metro versions follow symlinks by default, so `packages/core` should resolve as a
  workspace link. If it doesn't, check the RN/Metro version before adding workarounds.
