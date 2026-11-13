# Exporting a case archive on Android

The app writes verified ZIP files and their `.sha256` sidecars to its app-specific external files directory. No storage permission is needed.

Pull the exports directory from a connected device:

```sh
adb pull /sdcard/Android/data/com.socialparse.mobile/files/exports ./exports
```

On macOS, verify an archive against the downloaded sidecar:

```sh
cd exports
shasum -a 256 -c CASE-2026-0001_20261113T120000000Z.zip.sha256
```

Or calculate the digest directly and compare it with the `.sha256` file:

```sh
shasum -a 256 CASE-2026-0001_20261113T120000000Z.zip
cat CASE-2026-0001_20261113T120000000Z.zip.sha256
```
