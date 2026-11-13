# SocialParse Mobile (Android)

Forensic social-media screenshot and feed capture application for Android (National Investigation Agency - ACTD problem statement).

---

## 1. Prerequisites (macOS & Apple Silicon)

### 1.1 Java Development Kit (JDK 17 Required)
React Native 0.76 and Android Gradle Plugin (AGP) 8.x require **JDK 17**. Newer versions (JDK 21+) or older versions (JDK 8/11) will trigger Gradle daemon or compiler incompatibilities.

Verify your JDK installation:
```bash
/usr/libexec/java_home -V
```

Set `JAVA_HOME` to JDK 17 (add to `~/.zshrc` for persistence):
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
# Or if installed via standard macOS installer:
# export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.0.3.jdk/Contents/Home
export PATH=$JAVA_HOME/bin:$PATH
java -version
```

### 1.2 Android SDK & Environment Variables
Add Android SDK paths to your shell configuration (`~/.zshrc`):
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```
Reload shell:
```bash
source ~/.zshrc
```

---

## 2. Step-by-Step Execution Guide

### Step 1: Verify ANDROID_HOME and Platform Tools
Check that `ANDROID_HOME` is exported and pointing to a valid Android SDK directory:
```bash
echo $ANDROID_HOME
ls -d "$ANDROID_HOME/platform-tools"
```

### Step 2: Set Up & Launch an Apple Silicon arm64 Emulator
> **CRITICAL FOR APPLE SILICON (M1/M2/M3/M4):** Always use an **`arm64-v8a`** system image (Android 14 / API 34). Do **NOT** use `x86_64` images; running x86 on Apple Silicon requires Rosetta emulation which leads to severe lag, emulator crashes, or hypervisor boot failures.

1. Install API 34 system image via SDK Manager (if not already installed):
   ```bash
   sdkmanager "system-images;android-34;google_apis;arm64-v8a" "platforms;android-34" "build-tools;34.0.0"
   ```
2. Create an AVD (e.g. named `Pixel_7_API_34`):
   ```bash
   avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;arm64-v8a" --device "pixel_7"
   ```
3. List available emulators:
   ```bash
   emulator -list-avds
   ```
4. Start the emulator from terminal:
   ```bash
   $ANDROID_HOME/emulator/emulator -avd Pixel_7_API_34 -netdelay none -netspeed full &
   ```

### Step 3: Verify Emulator via ADB
Wait until the emulator finishes booting to the home screen, then verify:
```bash
adb devices
```
Expected output:
```text
List of devices attached
emulator-5554   device
```
*(Ensure status is `device`, not `offline` or `unauthorized`).*

### Step 4: Install Dependencies at Monorepo Root
From the repository root:
```bash
cd /path/to/socialparse
npm install
```

### Step 5: Start Metro Bundler
In Terminal Tab 1 (monorepo root or `apps/mobile`):
```bash
# Option A: From monorepo root
npm run --workspace=mobile start

# Option B: From apps/mobile folder
cd apps/mobile
npm run start
```

### Step 6: Build & Run on Android Emulator
In Terminal Tab 2 (monorepo root or `apps/mobile`):
```bash
# Option A: From monorepo root
npm run --workspace=mobile android

# Option B: From apps/mobile folder
cd apps/mobile
npm run android
```

---

## 3. NPM Scripts in `apps/mobile`

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run start` | `react-native start` | Boots Metro bundler configured with monorepo watchFolders |
| `npm run android` | `react-native run-android` | Compiles debug APK with Gradle and installs it on active emulator |
| `npm run lint` | `eslint .` | Runs project ESLint suite adhering to root rules |
| `npm run typecheck` | `tsc --noEmit` | Validates TypeScript types and `@socialparse/core` path alias |

---

## 4. Mac & Apple Silicon Troubleshooting

### 4.1 "Unable to locate a Java Runtime" / Gradle Build Errors
- **Symptom:** Running Gradle outputs `Unable to locate a Java Runtime` or fails with unsupported class file major version.
- **Cause:** Gradle daemon invoked without active `JAVA_HOME` pointing to JDK 17.
- **Fix:** Explicitly export `JAVA_HOME`:
  ```bash
  export JAVA_HOME=$(/usr/libexec/java_home -v 17)
  ```
  You can also enforce it in `android/gradle.properties`:
  ```properties
  org.gradle.java.home=/Library/Java/JavaVirtualMachines/jdk-17.0.3.jdk/Contents/Home
  ```

### 4.2 Metro Monorepo Module Resolution ("Cannot resolve module 'react'")
- **Symptom:** Metro throws `Invariant Violation` or cannot find `react` / `@socialparse/core`.
- **Cause:** Metro cache contains stale references or npm hoisted packages to root `node_modules`.
- **Fix:** Start Metro with a clean cache and port reverse:
  ```bash
  adb reverse tcp:8081 tcp:8081
  npx react-native start --reset-cache
  ```

### 4.3 Gradle Cannot Find `@react-native/gradle-plugin`
- **Symptom:** `Project directory '.../node_modules/@react-native/gradle-plugin' does not exist`.
- **Cause:** npm workspaces hoists `@react-native/gradle-plugin` to the repo root (`../../node_modules`).
- **Fix:** Already handled in `android/settings.gradle` with fallback detection:
  ```groovy
  pluginManagement {
      def rnpmPath = file("../node_modules/@react-native/gradle-plugin")
      if (!rnpmPath.exists()) {
          rnpmPath = file("../../node_modules/@react-native/gradle-plugin")
      }
      includeBuild(rnpmPath)
  }
  ```

### 4.4 Emulator Architecture Hang on Apple Silicon
- **Symptom:** Emulator hangs indefinitely at Google logo or crashes with qemu translation errors.
- **Cause:** Using `x86_64` system image on Apple Silicon (ARM64).
- **Fix:** Destroy the x86 AVD and install the `arm64-v8a` image:
  ```bash
  sdkmanager "system-images;android-34;google_apis;arm64-v8a"
  avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;arm64-v8a"
  ```
