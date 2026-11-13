# Android release APK

Create a private release keystore on macOS (keep it outside the repository):

```sh
keytool -genkeypair -v -keystore "$HOME/.gradle/socialparse-release.keystore" -alias socialparse -keyalg RSA -keysize 2048 -validity 10000
```

Add the following to `~/.gradle/gradle.properties`; use the passwords chosen above and never commit this file or the keystore:

```properties
SOCIALPARSE_RELEASE_STORE_FILE=/Users/yourname/.gradle/socialparse-release.keystore
SOCIALPARSE_RELEASE_STORE_PASSWORD=your-keystore-password
SOCIALPARSE_RELEASE_KEY_ALIAS=socialparse
SOCIALPARSE_RELEASE_KEY_PASSWORD=your-key-password
```

Build from `apps/mobile/android`:

```sh
./gradlew assembleRelease
```

The APK is `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`. Install a connected device with:

```sh
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```
