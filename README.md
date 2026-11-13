# SocialParse: Parsing of Social Media Feeds

**Problem Statement:** Parsing of Social Media Feeds  
**Client / Domain:** National Investigation Agency (NIA) - Anti-Cyber Terrorism Division  
**Category:** Software (Desktop & Android)

During investigations when the social media accounts of accused/suspects are opened for examination or creating Panchnamas, SocialParse automatically parses the data, captures evidence screenshots of posts, messages, timelines, friend lists, following/followers, and account info, and provides them in a structured, tamper-evident documented form.

---

## Architecture & Workspaces

The repository is organized as an npm workspaces monorepo:

- **[`packages/core`](packages/core):** Shared schemas, Zod validators, SHA-256 data contract types.
- **[`packages/ai-analyzer`](packages/ai-analyzer):** Multimodal AI analysis layer (OCR, entity extraction, section classification, screenshot quality checks, perceptual duplicate detection, and Panchnama HTML report generation).
- **[`workers/capture-worker`](workers/capture-worker):** Playwright automated desktop feed capture engine.
- **[`apps/desktop`](apps/desktop):** Electron / Node desktop examiner application.
- **[`apps/mobile`](apps/mobile):** React Native Android app for physical and dummy phone feed captures.

---

## Documentation

- **[AI Analyzer & Panchnama Documentation (`docs/AI_ANALYZER.md`)](docs/AI_ANALYZER.md):** Complete architecture, API contracts, evidence privacy guidelines, and forensic quality check specs.
- **[Data Contract Specification (`docs/DATA_CONTRACT.md`)](docs/DATA_CONTRACT.md):** Folder layout, SHA-256 hashing rules, and cryptographic audit log specifications.
- **[Worker Protocol Specification (`docs/WORKER_PROTOCOL.md`)](docs/WORKER_PROTOCOL.md):** Client-server WebSocket protocol between desktop app and capture worker.

---

## Quick Start (AI Analyzer)

```bash
# Install dependencies across all workspaces
npm install

# Run AI Analyzer test suite (53 tests)
npm test -w @smp/ai-analyzer

# Run strict TypeScript typecheck
npm run typecheck -w @smp/ai-analyzer

# Run ESLint
npm run lint

# Run interactive demonstration script
npm run demo -w @smp/ai-analyzer
```
