# SocialParse AI Analyzer & Documentation Layer

|                        |                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **Spec version**       | 1.0                                                                                  |
| **Package**            | `@smp/ai-analyzer` (`packages/ai-analyzer`)                                          |
| **Domain / Unit**      | Anti-Cyber Terrorism Division, National Investigation Agency (NIA)                  |
| **Role**               | AI Analysis, Multimodal Inspection & Panchnama Documentation Layer                    |
| **Companion Specs**    | [DATA_CONTRACT.md](DATA_CONTRACT.md), [WORKER_PROTOCOL.md](WORKER_PROTOCOL.md), [WALKTHROUGH.md](WALKTHROUGH.md) |

---

## 1. Executive Summary & Purpose

During digital forensic investigations, social media accounts of accused and suspect persons are seized and examined to generate court-admissible evidence documentation (**Panchnamas**). Because target platforms (Facebook, Instagram, X/Twitter, Telegram, WhatsApp, Google Account) often exhibit login restrictions, dynamic rendering, or device-specific protections on desktops, investigators frequently capture evidence across both desktop browsers (Playwright) and dummy Android devices.

The **SocialParse AI Analyzer & Documentation Layer** transforms raw, captured screenshots into structured, verifiable, and tamper-evident evidence reports:
1. **Automated Multimodal Parsing:** Eliminates human transcription errors by combining high-precision optical character recognition (OCR), entity extraction, and automated section classification.
2. **Quality & Anti-Evasion Detection:** Detects Android `FLAG_SECURE` black screens, failed blank renders, blurry captures, and duplicate repetitive screenshots via perceptual difference hashing (`dHash`).
3. **Forensic Integrity & Chain-of-Custody:** Strictly adheres to [DATA_CONTRACT.md](DATA_CONTRACT.md) v1.0. Preserves manifest SHA-256 hashes without modification and writes tamper-evident, cryptographic hash-chained audit events to `audit_log.jsonl`.
4. **Printable Panchnama Documentation:** Automatically generates courtroom-ready findings tables, cross-platform entity correlation indexes, and flagged evidence alerts with official signature blocks.
5. **Strict Evidence Privacy:** Default operations are 100% offline and deterministic. No evidence images or case metadata are transmitted off-machine without explicit examiner opt-in.

---

## 2. Architecture & Multimodal Pipeline

```
Evidence Case Folder (case.json, manifest.json, hashes.csv, audit_log.jsonl)
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ 1. CaseReader (validates & resolves evidentiary paths) │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 2. QualityChecker                                      │
│    ├─ Black Screen / FLAG_SECURE Detection             │
│    ├─ Blank / Unrendered Screen Detection              │
│    ├─ Blur Gradient Variance Score                     │
│    └─ Perceptual Hash (64-bit dHash) Duplicate Match   │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 3. Bilingual OcrService (Tesseract.js: eng + hin)      │
│    └─ Character recognition & whitespace normalization │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 4. EntityExtractor (Regex + Normalization)             │
│    ├─ Phone Numbers (Indian +91, domestic & E.164)     │
│    ├─ Emails (RFC compliant, normalized lowercase)     │
│    ├─ URLs & Shortlinks (t.me, wa.me, bit.ly, etc.)    │
│    ├─ Social Handles & @mentions                       │
│    ├─ Bilingual Hashtags (Latin & Devanagari)          │
│    └─ Dates & Relative Timestamps                      │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 5. SectionClassifier (Multilingual Heuristics)         │
│    └─ Categories: profile | posts | messages |         │
│       followers | following | account_info | security  │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 6. SummaryProvider (Pluggable Architecture)            │
│    ├─ RuleBasedSummaryProvider (Default, 100% offline) │
│    ├─ Credential Sanitization (Passwords/Tokens scrub) │
│    └─ Gemini / Claude Providers (Strict Opt-In)        │
└───────────────────────┬────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────┐
│ 7. Persistence & Documentation Outputs                 │
│    ├─ <platform>/analysis.json (Per-platform records)  │
│    ├─ analysis_summary.json (Case entity cross-index)  │
│    ├─ audit_log.jsonl (Hash-chained append-only event) │
│    └─ Printable Panchnama HTML Report                  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Evidence Privacy & Anti-Tamper Guarantees

- **No Unauthorized Data Egress:** All analysis (OCR, quality inspection, entity extraction, section classification, and rule-based summarization) executes entirely on local CPU memory.
- **Image Privacy Shield:** External LLM providers (`GeminiSummaryProvider`, `ClaudeSummaryProvider`) require explicit configuration (`allowExternalApi: true`). Even when opted in, raw image bytes are **never** transmitted off-machine; only extracted text and normalized entity tokens are sent.
- **Credential Protection:** Potential credentials (passwords, bearer tokens, API secrets) visible on login or authentication screens are automatically scrubbed and redacted from summaries with the `CREDENTIALS_DETECTED` flag.
- **Evidentiary Disclaimer:** All AI outputs, summary records, and report tables carry the mandatory evidentiary label:
  > `"machine-generated, examiner must verify"`
- **Hash Integrity:** Evidence SHA-256 hashes are copied directly from `manifest.json`. The AI analyzer never alters, renames, or replaces captured evidence.
- **Audit Hash Chaining:** Every analysis step appends an event to `audit_log.jsonl` using the canonical JSON SHA-256 chaining formula defined in [DATA_CONTRACT.md section 7.4](DATA_CONTRACT.md#74-hash-chaining).

---

## 4. Teammate Integration Guide

Teammates working on the desktop app, capture worker, or core library can integrate `@smp/ai-analyzer` using the following public exports.

### 4.1 Running the Full Pipeline on a Case Folder

```typescript
import { AnalysisPipeline, AnalysisWriter } from '@smp/ai-analyzer';

// Initialize pipeline with offline deterministic provider
const pipeline = new AnalysisPipeline();

// Execute multimodal analysis over the case folder
const result = await pipeline.analyzeCase('/path/to/CASE-2026-0042');

// Persist analysis.json and analysis_summary.json into the case folder
const writer = new AnalysisWriter();
await writer.writeAnalysisResults('/path/to/CASE-2026-0042', result);
```

### 4.2 Embedding HTML Report Sections into Core's `buildReportHtml`

```typescript
import {
  buildAiReportSectionsHtml,
  buildEntityIndexHtml,
  buildFlaggedItemsHtml,
  buildPlatformFindingsTableHtml
} from '@smp/ai-analyzer';

// 1. Generate all AI sections at once
const aiHtml = buildAiReportSectionsHtml(result.platformAnalyses, result.caseSummary);

// 2. Or insert individual modular components
const flaggedAlerts = buildFlaggedItemsHtml(result.caseSummary);
const entityIndexTable = buildEntityIndexHtml(result.caseSummary);
const instagramFindings = buildPlatformFindingsTableHtml(result.platformAnalyses['instagram']);
```

### 4.3 Generating Standalone Panchnama Evidence Reports

```typescript
import { buildFullPanchnamaAiReportHtml } from '@smp/ai-analyzer';

const fullReportHtml = buildFullPanchnamaAiReportHtml(caseData.caseJson, result);
// Output can be saved as an HTML file or rendered in a webview / printed directly
```

### 4.4 TypeScript Signatures

```typescript
export interface AnalysisRecord {
  screenshotId: string;
  platform: string;
  section: string;
  filePath: string;
  sha256: string;
  ocrText: string;
  entities: ExtractedEntity[];
  category: SectionCategory;
  confidence: number;
  flags: AnalysisFlag[];
  quality: QualityAssessment;
  summary: string;
  analyzedAt: string; // ISO 8601 UTC
  model: string;
  version: string;
  machineGeneratedDisclaimer: 'machine-generated, examiner must verify';
}

export interface CaseAnalysisSummary {
  caseId: string;
  generatedAt: string;
  totalScreenshots: number;
  platforms: Record<string, { total: number; flagged: number; categories: Record<string, number> }>;
  entityIndex: Record<string, { type: EntityType; value: string; appearances: Array<{ platform: string; screenshotId: string; section: string }> }>;
  flaggedItems: Array<{ screenshotId: string; platform: string; flags: AnalysisFlag[]; summary: string }>;
  disclaimer: 'machine-generated, examiner must verify';
}
```

---

## 5. Quality & Anomaly Detection Details

| Flag | Meaning | Forensic Significance |
| :--- | :--- | :--- |
| `FLAG_SECURE_BLOCKED` | Average brightness $\le 5$ or $> 95\%$ pixels are pitch black | Indicates Android operating system blocked screenshot capture (e.g. Telegram Secret Chat, WhatsApp View-Once, banking apps). Alerted so examiner can switch to optical capture or Android device mirror. |
| `BLANK_SCREEN` | Color variance $< 2.0$ | Signals unrendered page, network disconnect, or white screen of death. |
| `BLURRY` | Discrete gradient energy $< 20.0$ | Out of focus or low-resolution capture; flags potential OCR unreliability. |
| `DUPLICATE` | Perceptual dHash Hamming distance $\le 4$ | Redundant capture (e.g. scrolling failed to advance feed). Reduces examiner fatigue by deduplicating repetitive findings. |
| `CREDENTIALS_DETECTED` | Password or bearer token pattern observed | Potential credential leaked in screenshot; scrubbed from textual summaries. |
| `INSUFFICIENT_TEXT` | Extracted text $< 5$ characters | Pure visual media without textual captions. |

---

## 6. Verification & Test Suite

The package includes comprehensive unit and end-to-end integration tests written in Vitest:

```bash
# Run unit & integration test suite
npm test -w @smp/ai-analyzer

# Run type check (strict TypeScript)
npm run typecheck -w @smp/ai-analyzer

# Run ESLint
npm run lint

# Run interactive demonstration script
npm run demo -w @smp/ai-analyzer
```

---

## 7. Limitations & Operational Notes

1. **OCR on Distorted / Low-Contrast Graphics:** Highly stylized graffiti fonts or low-contrast memes may exhibit partial OCR recognition. The examiner must visually inspect original PNGs.
2. **Offline Mode Guarantees:** Default configuration never requires network connectivity or third-party API keys, ensuring functionality in air-gapped forensic laboratories.
3. **Hardware Requirements:** Node.js 20+ with minimum 2 GB RAM recommended for multi-page batch OCR processing.
