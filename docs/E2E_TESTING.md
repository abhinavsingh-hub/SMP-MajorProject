# End-to-End Testing & Cross-Platform Forensic Verification

This document describes the automated end-to-end (E2E) testing suite and CI pipeline implemented for SocialParse.

## 1. Overview

The E2E test suite (`packages/core/tests/e2e.test.ts`) validates the entire forensic lifecycle across platform boundaries without requiring manual interaction, physical devices, or live social media credentials:

1. **Case Creation**: Creates a forensic case folder structure compliant with DATA_CONTRACT.md §3 (`case.json`, `manifest.json`, `hashes.csv`, `audit_log.jsonl`).
2. **Evidence Capture**: Records evidence items across multiple platforms (`instagram`, `facebook`) with realistic dummy payloads, updating the manifest and computing SHA-256 digests.
3. **Audit Hash Chaining**: Verifies that every recorded evidence item has a corresponding `item_captured` event in the append-only, SHA-256 hash-chained `audit_log.jsonl`.
4. **Case Verification**: Runs the comprehensive 8-step `verifyCase()` integrity check.
5. **Report Generation**: Produces a Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam certificate with embedded SVG QR code and watermark overlay.
6. **Cross-Platform Android Export & Import**:
   - Simulates the Android export procedure documented in `docs/EXPORT_ANDROID.md` and implemented in `apps/mobile/src/export/exportCase.ts`.
   - Records the `case_exported` audit log event.
   - Archives the case into a `.zip` file with a corresponding `.sha256` checksum sidecar.
   - Simulates ingestion/import on a destination workstation.
   - Validates the archive checksum against the sidecar, extracts files, and validates file hashes against `hashes.csv`.
   - Re-runs `verifyCase()` to confirm end-to-end integrity.

## 2. Tested Failure & Tampering Scenarios

The test suite explicitly validates detection of tampered or corrupted evidence:

- **Modified Evidence File**: Modifying a single byte of an evidence screenshot causes `verifyCase()` to fail with a hash mismatch issue.
- **Corrupted Metadata**: Corrupting `hashes.csv` or `manifest.json` triggers immediate verification failure.
- **Missing Required Files**: Deleting required case files (such as `case.json` or screenshots) is detected and reported.

## 3. Running E2E Tests Locally

Run the complete monorepo test suite (Core, Desktop, and E2E):

```bash
npm test
```

Run only the E2E test file:

```bash
node --experimental-strip-types --test packages/core/tests/e2e.test.ts
```

Run linting and typechecking:

```bash
npm run lint
npm run typecheck
```

## 4. Continuous Integration (GitHub Actions)

The workflow defined in `.github/workflows/ci.yml` runs automatically on all `push` and `pull_request` events:

- Environment: `ubuntu-latest`
- Node.js version: `22` (reproducible install via `npm ci`)
- Jobs:
  - ESLint verification (`npm run lint`)
  - TypeScript typechecking across packages (`npm run typecheck`)
  - Full unit and E2E test suite execution (`npm test`)
