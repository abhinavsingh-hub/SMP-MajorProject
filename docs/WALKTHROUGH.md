# SocialParse: End-to-End System Walkthrough & Execution Guide

|                        |                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------ |
| **System**             | SocialParse – Parsing of Social Media Feeds                                          |
| **Division**           | National Investigation Agency (NIA), Anti-Cyber Terrorism Division (ACTD)             |
| **Target Platforms**   | Facebook, Instagram, X (Twitter), Telegram, WhatsApp, Google Account                 |
| **Guide Type**         | Technical Walkthrough, Operational Lifecycle & Examiner Verification Manual          |

---

## 1. Overview of the Evidentiary Lifecycle

When suspect social media feeds are accessed during anti-cyber terrorism investigations, examiners must extract and preserve data without altering digital evidence or introducing human error. SocialParse executes this through a unified five-phase lifecycle:

```
[Phase 1: Capture] ──► [Phase 2: Storage] ──► [Phase 3: Inspection] ──► [Phase 4: Extraction] ──► [Phase 5: Panchnama Report]
Playwright / Android   DATA_CONTRACT v1.0     Quality & Anti-Evasion    Bilingual OCR & Entities   Court-Admissible HTML
```

This walkthrough explains how each subsystem works, the exact mathematical and algorithmic logic applied, and how to execute and inspect the outputs.

---

## 2. Phase-by-Phase Technical Walkthrough

### Phase 1: Capture Ingestion & File Resolution (`CaseReader`)
- **Module:** `packages/ai-analyzer/src/case-reader.ts`
- **Execution:** When `pipeline.analyzeCase(caseFolder)` is invoked, `CaseReader` verifies the presence of the mandatory metadata files specified in [docs/DATA_CONTRACT.md](DATA_CONTRACT.md):
  1. `case.json`: Ingests case ID (`CASE-YYYY-NNNN`), FIR number, examiner details, accused name, and capturing device specs.
  2. `manifest.json`: Ingests the official list of captured evidence items.
  3. `hashes.csv`: Validates cross-agreement with the manifest.
  4. `audit_log.jsonl`: Ingests the tamper-evident event log.
- **Evidentiary Hash Rule:** Each evidence screenshot has a pre-calculated SHA-256 fingerprint stored in `manifest.json`. The AI analyzer **copies this hash verbatim** (`record.sha256 = item.sha256`) and never recalculates or modifies evidence hashes.

---

### Phase 2: Forensic Quality Inspection & Anti-Evasion (`QualityChecker`)
- **Module:** `packages/ai-analyzer/src/quality-checker.ts`
- Before executing OCR or language models, the raw PNG bytes are analyzed to catch capture anomalies and anti-forensic defenses:

#### 1. Android `FLAG_SECURE` Black Screen Detection
- **The Problem:** Apps like Telegram (Secret Chats), WhatsApp (View-Once media), and banking apps enable Android's `WindowManager.LayoutParams.FLAG_SECURE`. When captured via standard projection or automated screencaps, the Android OS yields an all-black image.
- **Algorithm:** Each pixel's perceived luminance $Y$ is calculated using the standard ITU-R BT.601 formula:
  $$Y = 0.299 \times R + 0.587 \times G + 0.114 \times B$$
  If the average brightness across the entire screen is $\le 5.0$, or if $> 95\%$ of all pixels have luminance $\le 2.0$, the analyzer flags:
  `FLAG_SECURE_BLOCKED`
- **Forensic Impact:** The examiner is alerted immediately to switch to an optical external capture or hardware mirror.

#### 2. Blank / Unrendered Screen Detection
- **The Problem:** Network drops or unrendered client-side Single Page Applications (SPAs) often capture completely white or solid grey backgrounds.
- **Algorithm:** Measures standard deviation $\sigma$ of pixel luminance across the screen:
  $$\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^N (Y_i - \bar{Y})^2}$$
  If $\sigma \le 2.0$ on non-black screens, the analyzer flags `BLANK_SCREEN`.

#### 3. Blurry Capture Detection
- **Algorithm:** Computes the discrete gradient energy (edge variance) across a sample grid of horizontal and vertical luminance differences:
  $$\Delta x = Y(x+1, y) - Y(x, y), \quad \Delta y = Y(x, y+1) - Y(x, y)$$
  $$\text{Blur Score} = \frac{1}{M} \sum \sqrt{\Delta x^2 + \Delta y^2}$$
  If the blur score is $< 20.0$, the item is flagged `BLURRY` to warn the examiner that OCR results may be degraded.

#### 4. Perceptual Difference Hashing (`dHash`) & Duplicate Elimination
- **The Problem:** Automated feed capture scripts frequently scroll without advancing (e.g. infinite scroll loading delays), capturing duplicate screenshots that inflate case sizes.
- **Algorithm:**
  1. Downsamples the PNG into a $9 \times 8$ grayscale matrix.
  2. Compares adjacent pixels in each row ($P(x, y) > P(x+1, y) \implies 1$, else $0$).
  3. Produces a 64-bit binary fingerprint encoded as a 16-character hexadecimal string.
  4. Computes the Hamming distance (number of bit flips) between the current screenshot and previously indexed screenshots in the case:
     $$\text{HammingDistance}(H_1, H_2) \le 4$$
  If the distance is $\le 4$, the screenshot is flagged `DUPLICATE` with `duplicateOfId: "ITEM-XXXX"`.

---

### Phase 3: Bilingual Optical Character Recognition (`OcrService`)
- **Module:** `packages/ai-analyzer/src/ocr-service.ts`
- **Engine:** Tesseract.js initialized with bilingual trained models (`eng+hin`).
- **Processing:**
  - Extracts English text and Devanagari Hindi characters simultaneously.
  - Normalizes line breaks (`\r\n` $\rightarrow$ `\n`), collapses redundant spaces, and normalizes paragraph breaks.
  - Computes word-level and document-level confidence metrics.
  - For offline CI/test environments, provides a zero-latency `MockOcrEngine` ensuring tests complete in milliseconds.

---

### Phase 4: Investigative Entity Extraction & Normalization (`EntityExtractor`)
- **Module:** `packages/ai-analyzer/src/entity-extractor.ts`
- Parses the extracted text for key forensic investigative artifacts:

| Entity Type | Regex & Matching Pattern | Normalization Rule |
| :--- | :--- | :--- |
| **Phone Numbers** | International E.164 (`+\d{1,3}[\s.-]?\d{3,5}[\s.-]?\d{4,5}`) & Indian domestic mobile (`[6-9]\d{4}[\s.-]?\d{5}`) | Standardized to `+<country><digits>` or `+91<10digits>`. Strips dashes, spaces, and punctuation. |
| **Email Addresses** | `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` | Normalized to lowercase (e.g. `user@target.org`). |
| **URLs & Links** | `https?:\/\/[^\s<>"'{}]+` and shortlinks (`t.me/*`, `wa.me/*`, `bit.ly/*`, `linktr.ee/*`) | Standardized with `https://` prefix. Strips trailing sentence punctuation. |
| **User Handles** | `(?<![\w.-])@([A-Za-z0-9_.]{2,30})` | Converted to `@lowercase`. Excludes email fragments (e.g. `@domain.com`). |
| **Hashtags** | `(?<![\w\p{sc=Devanagari}])#([\w\p{sc=Devanagari}]{2,50})` | Normalizes Latin and Devanagari script tags (e.g. `#CyberSecurity`, `#जांच_अभियान`). |
| **Dates & Times** | ISO `YYYY-MM-DD`, `DD/MM/YYYY`, named month formats, and relative indicators (`2h ago`, `3d ago`) | Standardized to ISO dates or normalized relative time strings. |

---

### Phase 5: Multilingual Section Classification (`SectionClassifier`)
- **Module:** `packages/ai-analyzer/src/section-classifier.ts`
- Maps evidence screens into 7 standardized forensic categories:
  - `profile`: Bio, edit profile, joined date, follower counts, header info (cues: "Edit Profile", "बायो", "परिचय").
  - `posts`: Timeline feed, status updates, tweets, retweets, comments (cues: "Feed", "Posts", "टिप्पणी", "पोस्ट").
  - `messages`: Direct messages, chats, inboxes, voice notes (cues: "Chats", "Type a message", "संदेश", "चैट").
  - `followers`: Follower rosters, subscribers, followed by (cues: "Followers", "फ़ॉलोअर्स").
  - `following`: Accounts followed, mutual subscriptions (cues: "Following", "Unfollow").
  - `account_info`: Email, phone number, birthday, user ID, account settings (cues: "Personal info", "Manage Account").
  - `security`: 2-factor authentication, active sessions, passkeys, passwords (cues: "2-Step Verification", "सुरक्षा").
- Integrates platform-specific adjustments (e.g. WhatsApp/Telegram "last seen" or "online" boost `messages`) and incorporates capture hints from file naming.

---

### Phase 6: Summarization & Privacy Redaction (`SummaryProvider`)
- **Module:** `packages/ai-analyzer/src/summary-provider.ts` and `llm-summary-provider.ts`
- **Rule-Based Summarizer (Default):** Runs 100% locally with zero network calls. Synthesizes identified handles, contact points, links, and flags into structured investigative findings.
- **Opt-In LLM Summarizers (Gemini / Claude):** Activated only when `allowExternalApi: true` is explicitly passed. Raw images are **never** transmitted off-machine.
- **Credential Protection:** Automatic pattern scanning scrubs exposed passwords (`password: [REDACTED_CREDENTIAL]`) and authorization bearer tokens before summaries are generated, setting the `CREDENTIALS_DETECTED` flag.
- **Evidentiary Disclaimer:** Every analysis record and report embeds the required legal notice:
  `"machine-generated, examiner must verify"`

---

### Phase 7: Tamper-Evident Hash Chaining (`AuditLogger`)
- **Module:** `packages/ai-analyzer/src/audit-logger.ts`
- Implements the cryptographic chaining specification in [DATA_CONTRACT.md section 7.4](DATA_CONTRACT.md#74-hash-chaining):
  1. Strips the `event_hash` field.
  2. Converts the event to **Canonical JSON** (recursively sorting all keys alphabetically, eliminating all whitespace and line breaks).
  3. Computes the SHA-256 hash of the canonical bytes.
  4. Appends the event with `prev_hash` pointing to the previous line's hash.
- The first line uses 64 zeros (`0000000000000000000000000000000000000000000000000000000000000000`).

---

### Phase 8: Analysis Persistence (`AnalysisWriter`)
- **Module:** `packages/ai-analyzer/src/analysis-writer.ts`
- Persists outputs into the case folder:
  - `<caseFolder>/<platform>/analysis.json`: Array of `AnalysisRecord` objects for each platform.
  - `<caseFolder>/analysis_summary.json`: Case-level aggregation containing:
    - Platform capture metrics.
    - **Cross-Platform Entity Index:** Links entities found across multiple platforms (e.g. identifying that phone number `+919876543210` appeared on both an Instagram bio and a Facebook profile).
    - **Flagged Items Index:** Highlighting all items flagged for examiner verification.

---

### Phase 9: Panchnama HTML Report Generation (`ReportSections`)
- **Module:** `packages/ai-analyzer/src/report-sections.ts`
- Produces court-admissible HTML documentation:
  - Official NIA Anti-Cyber Terrorism header.
  - Case metadata grid (FIR number, accused alias, examiner designation, capturing hardware).
  - Prominent verification alert cards for flagged items.
  - Cross-platform entity correlation table.
  - Per-platform findings tables with SHA-256 hashes, extracted entities, and summaries.
  - Formal signature blocks for **Panch Witness 1**, **Panch Witness 2**, and the **Investigating Officer**.
  - Optimized `@media print` CSS rules ensuring clean page breaks and high-contrast printing.

---

## 3. Hands-On Execution & Output Verification

### Step 1: Run the Interactive Demo
Run the demo script from the root of the monorepo:

```bash
npm run demo -w @smp/ai-analyzer
```

### Step 2: Observe Terminal Output
The script automatically constructs a synthetic evidentiary case folder, runs the full analysis pipeline, and outputs terminal logs:

```text
======================================================================
  SocialParse: AI Analysis & Panchnama Documentation Layer
  National Investigation Agency (NIA) - Anti-Cyber Terrorism
======================================================================

[1/5] Initializing evidentiary case directory: /path/to/packages/ai-analyzer/.demo-output/CASE-2026-0042
[2/5] Generated case metadata and 5 evidence screenshots.

[3/5] Running multimodal AI analysis pipeline...
Pipeline completed in 8ms.

[4/5] Persisting platform analysis.json and case analysis_summary.json...
Written 3 platform analysis files.
Written summary to: .../.demo-output/CASE-2026-0042/analysis_summary.json

[5/5] Generating Panchnama-style printable HTML documentation...
Report generated successfully at: .../.demo-output/CASE-2026-0042/panchnama_ai_report.html

======================================================================
  ANALYSIS FINDINGS SUMMARY
======================================================================
Case ID:              CASE-2026-0042
Total Screenshots:    5
Flagged Alerts:       4
Cross-Platform Keys:  8 entities

Flagged Items (Requiring Forensic Verification):
  - [ITEM-0002] (INSTAGRAM): BLURRY
    Reason: Instagram posts feed/timeline view (feed). Tags: #cybercampaign #mission2026.
  - [ITEM-0003] (TELEGRAM): FLAG_SECURE_BLOCKED, DUPLICATE
    Reason: ALERT: Screen content on telegram (secret_chat) was blocked by the operating system (Android FLAG_SECURE). Display rendered pitch black.
  - [ITEM-0004] (FACEBOOK): DUPLICATE
    Reason: Duplicate capture detected on facebook (profile); visual content is perceptually identical to an earlier item in the sequence.
  - [ITEM-0005] (FACEBOOK): BLURRY, DUPLICATE
    Reason: Duplicate capture detected on facebook (feed); visual content is perceptually identical to an earlier item in the sequence.

Cross-Platform Entity Correlations:
  - MATCH [phone:+919876543210]: Observed across [instagram:ITEM-0001, facebook:ITEM-0004]
  - MATCH [hashtag:#cybercampaign]: Observed across [instagram:ITEM-0002, facebook:ITEM-0005]
  - MATCH [hashtag:#mission2026]: Observed across [instagram:ITEM-0002, facebook:ITEM-0005]
  - MATCH [date:2h ago]: Observed across [instagram:ITEM-0002, facebook:ITEM-0005]
```

### Step 3: Inspect the Generated HTML Report
Open `packages/ai-analyzer/.demo-output/CASE-2026-0042/panchnama_ai_report.html` in Chrome, Safari, or Firefox:
- Note the official NIA Anti-Cyber Terrorism header.
- Review the **Examiner Verification Alerts** section highlighting the Telegram `FLAG_SECURE_BLOCKED` capture in high-visibility red.
- Review the **Cross-Platform Entity Correlation Index** highlighting matched phone numbers (`+919876543210`) across Instagram and Facebook.
- Use your browser's Print dialog (`Cmd + P` / `Ctrl + P`) to verify the clean print layout and witness signature blocks.
