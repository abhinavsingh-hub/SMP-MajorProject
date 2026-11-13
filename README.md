# SocialParse: Parsing of Social Media Feeds for Forensic Panchnamas

> **National Investigation Agency (NIA)**  
> **Anti-Cyber Terrorism Division (ACTD)**  
> **Domain / Category:** Cyber Forensics, Digital Evidence & Automated Feed Parsing (Software: Desktop & Android)

---

## 1. Problem Statement & Operational Context

During cybercrime and counter-terrorism investigations, social media accounts of accused and suspect persons are seized and examined to generate court-admissible forensic documentation (**Panchnamas**). Investigators must capture and catalog screenshots of posts, direct messages, timelines, friend lists, following/followers, and account metadata across multiple platforms including:
- **Facebook**
- **X (formerly Twitter)**
- **Instagram**
- **Telegram**
- **WhatsApp**
- **Google Account & Services**

### Key Operational Challenges
1. **Desktop Access Restrictions:** Frequently, target accounts fail to open on desktop browsers due to hardware-fingerprinting, multi-factor authentication, or security barriers, requiring examiners to use a dummy Android device alongside desktop capture workflows.
2. **Human Error in Documentation:** Manual screenshot logging, transcription of usernames, phone numbers, and cross-platform correlation is error-prone, labor-intensive, and susceptible to legal challenges in court.
3. **Chain of Custody & Evidence Tampering:** Digital evidence must strictly prove **what was captured, when it was captured, and that nothing was altered afterwards**.
4. **Android Anti-Screenshot Defenses (`FLAG_SECURE`):** Sensitive apps often engage Android operating system protections that result in pitch-black screenshots. The tool must identify these obstructions automatically so examiners can employ alternate optical capture methods.

**SocialParse** solves this end-to-end by unifying desktop Playwright automation, Android feed capture, cryptographic hash-chaining, and a multimodal AI analysis layer that produces tamper-evident, court-ready Panchnama reports.

---

## 2. Complete System Architecture

SocialParse is architected as an npm workspaces monorepo separating capture workers, core evidentiary contracts, user interfaces, and the AI analysis engine:

```
                                 ┌─────────────────────────────────────────┐
                                 │       EXAMINER WORKSTATION / UI         │
                                 │     (Desktop App / Android Phone)       │
                                 └────────────────────┬────────────────────┘
                                                      │
                            ┌─────────────────────────┴────────────────────────┐
                            ▼                                                  ▼
             ┌─────────────────────────────┐                    ┌─────────────────────────────┐
             │       Desktop Worker        │                    │         Android App         │
             │     (Playwright Engine)     │                    │       (React Native)        │
             │  workers/capture-worker     │                    │         apps/mobile         │
             └──────────────┬──────────────┘                    └──────────────┬──────────────┘
                            │                                                  │
                            │  WebSocket Protocol (WORKER_PROTOCOL.md §4)       │  Physical / Mirror Capture
                            └─────────────────────────┬────────────────────────┘
                                                      │
                                                      ▼
                            ┌──────────────────────────────────────────────────┐
                            │               Case Evidence Folder               │
                            │         CASE-YYYY-NNNN/ (DATA_CONTRACT.md)       │
                            │  ├─ case.json          ├─ hashes.csv             │
                            │  ├─ manifest.json      ├─ audit_log.jsonl        │
                            │  └─ <platform>/screenshots/*.png                 │
                            └─────────────────────────┬────────────────────────┘
                                                      │
                                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                @smp/ai-analyzer (AI & Documentation Layer)                       │
 │                                                                                                  │
 │  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐  │
 │  │ 1. CaseReader   │ ───► │ 2. QualityCheck │ ───► │ 3. Bilingual    │ ───► │ 4. Entity       │  │
 │  │ Manifest parser │      │ FLAG_SECURE/    │      │ OCR (eng + hin) │      │ Extractor       │  │
 │  │ Hash validation │      │ Blank/Blur/dHash│      │ Tesseract.js    │      │ Phone/Email/URL │  │
 │  └─────────────────┘      └─────────────────┘      └─────────────────┘      └────────┬────────┘  │
 │                                                                                      │           │
 │  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐               │           │
 │  │ 8. Panchnama    │ ◄─── │ 7. Persistence  │ ◄─── │ 6. Summary      │ ◄─── 5. Section           │
 │  │ HTML Report &   │      │ analysis.json & │      │ Provider        │      Classifier           │
 │  │ Signatures      │      │ analysis_summary│      │ Rule-based/LLM  │      (Heuristics)         │
 │  └─────────────────┘      └─────────────────┘      └─────────────────┘                           │
 └──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Monorepo Workspaces Breakdown

| Module / Package | Path | Ownership / Scope |
| :--- | :--- | :--- |
| **`@smp/core`** | `packages/core` | Evidentiary schemas, Zod validation, SHA-256 contracts, audit event primitives. |
| **`@smp/ai-analyzer`** | `packages/ai-analyzer` | Multimodal AI analysis layer: OCR (eng+hin), entity extraction, section classification, screenshot quality checks, duplicate perceptual hashing, and Panchnama HTML report generation. |
| **Capture Worker** | `workers/capture-worker` | Node.js + Playwright worker controlling automated browser feed navigation. |
| **Desktop App** | `apps/desktop` | Electron / Node desktop interface for examiners. |
| **Mobile App** | `apps/mobile` | React Native Android application for capturing feeds on physical or dummy devices. |

---

## 3. Case Folder & Evidentiary Standard (`DATA_CONTRACT.md`)

Every investigation is isolated in its own folder named after the `case_id` (`CASE-YYYY-NNNN`). All evidence and metadata files adhere strictly to [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md) v1.0:

```
CASE-2026-0042/
├── case.json                  # Case details (FIR number, examiner, accused, device)
├── manifest.json              # Official evidence list with SHA-256 and ISO 8601 UTC timestamps
├── hashes.csv                 # Flat CSV list of file hashes for independent verification
├── audit_log.jsonl            # Append-only, tamper-evident hash-chained event diary
├── analysis_summary.json      # Case-level AI findings, entity cross-index & flagged alerts
├── instagram/
│   ├── analysis.json          # Per-platform AI analysis records array
│   └── screenshots/
│       ├── instagram_profile_0001_20261112T093158Z.png
│       └── instagram_feed_0002_20261112T093221Z.png
├── facebook/
│   ├── analysis.json
│   └── screenshots/
│       ├── facebook_profile_0003_20261112T093403Z.png
│       └── facebook_feed_0004_20261112T093427Z.png
└── telegram/
    ├── analysis.json
    └── screenshots/
        └── telegram_secret_chat_0005_20261112T093510Z.png
```

### Forensic Hash Invariance & Chaining
1. **SHA-256 Invariance:** Evidence hashes are copied directly from `manifest.json`. The AI analyzer **never** recomputes or alters evidence hashes.
2. **Cryptographic Audit Hash Chaining (§7.4):** Every line of `audit_log.jsonl` contains `prev_hash` (pointing to the prior line's `event_hash`) and calculates its own `event_hash` over canonical JSON. Any tampering, re-ordering, or line deletion is immediately detected.

---

## 4. AI Analyzer Pipeline Overview

The `@smp/ai-analyzer` multimodal pipeline processes each evidence screenshot through 8 rigorous stages:

1. **Evidentiary Ingestion (`CaseReader`):** Loads `case.json`, `manifest.json`, `hashes.csv`, and `audit_log.jsonl`.
2. **Forensic Quality Inspection (`QualityChecker`):**
   - **`FLAG_SECURE_BLOCKED`:** Detects solid black screens (average brightness $\le 5$) caused by Android OS screenshot blocking.
   - **`BLANK_SCREEN`:** Detects unrendered or solid color frames.
   - **`BLURRY`:** Evaluates discrete gradient energy across pixel luminance.
   - **`DUPLICATE`:** Computes 64-bit difference perceptual hashes (`dHash`) and measures Hamming distance ($\le 4$) to detect repetitive captures.
3. **Bilingual OCR (`OcrService`):** Extracts text in English and Hindi (`eng+hin`) with character normalization and word-level confidence scoring.
4. **Investigative Entity Extraction (`EntityExtractor`):** Extracts and normalizes:
   - Indian domestic (`+91`) and international (E.164) phone numbers.
   - RFC-compliant email addresses (lowercase normalized).
   - Social handles and `@mentions` (excluding email fragments).
   - Direct URLs and messaging shortlinks (`t.me`, `wa.me`, `bit.ly`, `linktr.ee`).
   - Latin and Devanagari (Hindi) hashtags (e.g. `#CyberSecurity`, `#जांच_अभियान`).
   - Calendar dates (ISO, DD/MM/YYYY, textual) and social relative timestamps (`2h ago`, `3d ago`).
5. **Multilingual Section Classifier (`SectionClassifier`):** Categorizes screens into `profile`, `posts`, `messages`, `followers`, `following`, `account_info`, or `security` using bilingual keyword lexicons and weighted capture hints.
6. **Pluggable Summarizer (`SummaryProvider`):**
   - **`RuleBasedSummaryProvider` (Default):** 100% offline, deterministic, zero-network. Generates structured investigative finding statements.
   - **`GeminiSummaryProvider` & `ClaudeSummaryProvider`:** High-level contextual summaries behind explicit opt-in flags (`allowExternalApi: true`). Raw image bytes are **never** transmitted off-machine.
   - **Credential Sanitization:** Automatically redacts passwords, tokens, and API secrets.
7. **Tamper-Evident Persistence (`AnalysisWriter`):** Generates `<platform>/analysis.json` and `analysis_summary.json` matching Zod validation schemas.
8. **Court-Ready Panchnama HTML Generator (`ReportSections`):** Emits findings tables, cross-platform entity correlation index, flagged alerts, and printable Panchnama annexures with signature blocks.

---

## 5. Quick Start & Verification

### Prerequisites
- Node.js 20+ (LTS)
- npm 10+

### Installation & Test Suite
```bash
# Clone the repository
git clone https://github.com/abhinavsingh-hub/SMP-MajorProject.git
cd SMP-MajorProject

# Install all monorepo dependencies
npm install

# Run the AI Analyzer test suite (53 unit & integration tests)
npm test -w @smp/ai-analyzer

# Run strict TypeScript type checking (zero any)
npm run typecheck -w @smp/ai-analyzer

# Run ESLint across the monorepo
npm run lint
```

### Running the Interactive Demonstration
Execute the self-contained demonstration script to generate a sample case, analyze screenshots across Instagram, Facebook, and Telegram, and produce a court-ready Panchnama HTML report:

```bash
npm run demo -w @smp/ai-analyzer
```

The script will output:
- Summary of extracted entities and cross-platform matches.
- Flagged alerts (`FLAG_SECURE_BLOCKED`, `BLURRY`, `DUPLICATE`).
- Printable HTML document at `packages/ai-analyzer/.demo-output/CASE-2026-0042/panchnama_ai_report.html`.

---

## 6. Documentation Directory

- **[docs/AI_ANALYZER.md](docs/AI_ANALYZER.md):** Deep-dive AI analyzer architecture, types, API reference, and forensic rules.
- **[docs/WALKTHROUGH.md](docs/WALKTHROUGH.md):** Step-by-step walkthrough explaining how every module executes from capture to final Panchnama report.
- **[docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md):** Evidentiary directory layout, SHA-256 rules, and audit log hash chaining specification.
- **[docs/WORKER_PROTOCOL.md](docs/WORKER_PROTOCOL.md):** WebSocket communication protocol between desktop app and capture worker.
