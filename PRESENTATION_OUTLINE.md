# SocialParse: 10-Slide Academic & Technical Presentation Outline

> **Subject:** Final Year Major Project / Capstone Presentation  
> **Topic:** Automated Social Media Feed Parser & Forensic Panchnama Generator  
> **Target Audience:** Project Evaluation Committee, Faculty Examiners, and Forensic Practitioners

---

## Slide 1: Project Title & Team Introduction

- **Slide Title:** SocialParse — Automated Social Media Feed Parser for Forensic Panchnamas
- **Subtitle:** Digital Evidence Seizure, Cryptographic Hash-Chaining & Section 65B/63 BSA Compliance
- **Main Talking Points:**
  - Project developed under the NIA Anti-Cyber Terrorism Division (ACTD) forensic problem statement.
  - Team members and role distribution:
    - **Person 1:** Capture Worker & Playwright Browser Automation Daemon.
    - **Person 2:** Android Native Application, Accessibility Service & On-Device PDF Reporting.
    - **Person 3:** Core Engine (`@smp/core`), Desktop App Shell, Cryptographic Integrity & Documentation.
    - **Person 4:** Multimodal AI Analyzer (Bilingual OCR, Entity Extraction & dHash Duplicate Detection).
  - Academic Advisor and Department affiliation.
- **Suggested Visual / Diagram:** Official Project Title Banner, Monorepo Package Badges (`@smp/core`, `@smp/ai-analyzer`, `mobile`, `desktop`), and Team Member Matrix.
- **Presenter Notes:**  
  _"Good morning respected evaluators. Today our team presents SocialParse, a comprehensive forensic engineering platform built to solve one of the most critical challenges in modern cybercrime investigation: legally admissible, tamper-proof seizure of social media accounts."_

---

## Slide 2: Problem Statement

- **Slide Title:** The Forensic Challenge in Cybercrime Investigation
- **Main Talking Points:**
  - Social media accounts (Instagram, Facebook, X, Telegram, WhatsApp) are central to modern criminal and counter-terrorism investigations.
  - **Operational Pain Points:**
    1. **Authentication Lockouts on Desktop:** Target accounts often fail to open on lab PCs due to hardware fingerprinting, SMS OTP, and 2FA, forcing officers to use phones.
    2. **Human Error & Investigative Fatigue:** Manually capturing and indexing hundreds of posts and chat screens is slow and prone to errors.
    3. **Legal Vulnerability in Court:** Defense attorneys frequently dispute manual screenshots, alleging manipulation, cherry-picking, or lack of contemporaneous timestamping.
    4. **Android Anti-Screenshot Defenses:** Apps engage `FLAG_SECURE`, causing captured screenshots to be pitch black without warning.
- **Suggested Visual / Diagram:** A split visual showing: (Left) Manual workflow chaos with sticky notes, camera photos of phone screens, and unorganized folders; (Right) A red challenge stamp highlighting court rejection risks under Section 65B.
- **Presenter Notes:**  
  _"When investigating terror threats or financial fraud, officers must document live social feeds. But manual screenshots taken on phones or PCs face severe challenges in court because there is no cryptographic proof of when the screen was captured, or whether it was altered afterwards."_

---

## Slide 3: Proposed Solution

- **Slide Title:** The SocialParse Unified Forensic Ecosystem
- **Main Talking Points:**
  - An integrated software suite delivering end-to-end evidence collection across Desktop and Android.
  - **Key Solution Pillars:**
    - **Cross-Platform Capture:** Automated browser navigation on Desktop and Accessibility-driven scrolling on Android.
    - **Immediate Cryptographic Hashing:** Computes SHA-256 digests at the exact millisecond of screen capture.
    - **Append-Only Audit Ledger:** Continuous cryptographic hash-chaining where every action seals the prior event.
    - **Bilingual Multimodal AI Analysis:** Offline OCR in English and Hindi, entity extraction (phone numbers, emails, handles), and duplicate image suppression.
    - **One-Click Statutory Panchnama:** Automatically generates court-ready Panchnama reports compliant with Section 65B Indian Evidence Act and Section 63 Bharatiya Sakshya Adhiniyam 2023.
- **Suggested Visual / Diagram:** Three-stage linear pipeline graphic: `Capture (Desktop/Mobile) → Verify & Hash (Core Engine) → Certified Panchnama (HTML/PDF)`.
- **Presenter Notes:**  
  _"SocialParse provides a standardized, automated pipeline. It navigates the feeds, captures screenshots, immediately calculates SHA-256 hashes, maintains a tamper-evident audit ledger, and outputs a complete legal Panchnama with witness signature areas."_

---

## Slide 4: System Architecture

- **Slide Title:** Modular Architecture & Data Contracts
- **Main Talking Points:**
  - Structured as an npm workspaces monorepo separating concerns while sharing core business logic.
  - **Architecture Highlights:**
    - **`packages/core`:** Platform-agnostic hub containing Zod schemas, FileSystem abstraction, and audit chaining.
    - **`apps/desktop`:** React Native macOS application for case management and capture monitoring.
    - **`apps/mobile`:** React Native Android application using Android Accessibility Service for hands-free feed navigation.
    - **`workers/capture-worker`:** Playwright-based browser engine controlled via a local WebSocket protocol.
    - **`packages/ai-analyzer`:** Multimodal offline analysis pipeline.
    - **`CASE-YYYY-NNNN/`:** Self-contained case folder containing `case.json`, `manifest.json`, `hashes.csv`, and `audit_log.jsonl`.
- **Suggested Visual / Diagram:** High-level Mermaid architecture diagram showing data flow from Desktop/Android capture engines into the Case Repository and onward to the Panchnama generator.
- **Presenter Notes:**  
  _"Here is our system architecture. Notice that both the Desktop and Mobile apps rely on the same platform-independent core library. File access is abstracted through a FileSystem interface, and hashing is injected via dependency injection, allowing the exact same verification logic to run on macOS, Linux, and Android."_

---

## Slide 5: Technology Stack

- **Slide Title:** Technology Stack & Standards
- **Main Talking Points:**
  - **Languages & Frameworks:** TypeScript 5.8 (Strict Mode), Node.js 22 LTS, React 18, React Native 0.76.
  - **Desktop:** React Native macOS, Metro Bundler, CocoaPods 1.17.
  - **Mobile:** Android API 34 (Android 14), Android Accessibility Framework, MediaProjection API, `react-native-fs`.
  - **Automation & WebSocket:** Playwright, Node.js `ws` WebSocket protocol.
  - **AI & Computer Vision:** Tesseract.js (bilingual OCR for Latin & Devanagari), Sharp (luminance analysis & 64-bit dHash).
  - **Evidentiary Validation:** Zod schemas, KaTeX math rendering, pure TypeScript zero-dependency QR code generator.
  - **DevOps & Testing:** GitHub Actions CI, Node.js Test Runner, ESLint 9, Prettier.
- **Suggested Visual / Diagram:** A structured technology grid grouping tools by Category: Frontend / UI, Core Engine, Native Mobile, AI/Vision, and Testing/CI.
- **Presenter Notes:**  
  _"We chose modern, industry-standard technologies. The entire codebase is written in strict TypeScript with zero 'any' types in core. For mobile, we leverage native Android accessibility services to safely automate feed scrolling without needing root access."_

---

## Slide 6: Core Features & Application Workflow

- **Slide Title:** Step-by-Step Investigative Workflow
- **Main Talking Points:**
  - **1. Case Registration:** Examiner registers FIR number, officer details, agency, accused name, and hardware ID.
  - **2. Feed Harvesting:** Examiner selects target platforms (Instagram, Facebook, X, Telegram).
  - **3. User Action Handling (`needs_user`):** System pauses gracefully for login, OTP, or CAPTCHA, instructing the examiner to act directly in the browser.
  - **4. On-the-Fly Pause / Resume:** Mobile app supports pausing to inspect content and resuming without breaking sequence numbers.
  - **5. Case Export & Checksumming:** Cases are exported as ZIP packages with SHA-256 sidecar files for verifiable cross-machine transport.
- **Suggested Visual / Diagram:** Process flowchart showing the examiner journey from FIR registration on Desktop/Mobile to automated screenshot recording and ZIP packaging.
- **Presenter Notes:**  
  _"From an examiner's perspective, the workflow is intuitive. They register the FIR, select the social platforms, and start capture. If an account requires an OTP or two-factor authentication, the software detects this, prompts the examiner to log in, and automatically resumes once the feed appears."_

---

## Slide 7: Evidence Collection & Panchnama Workflow

- **Slide Title:** The Legal Panchnama Seizure Lifecycle
- **Main Talking Points:**
  - **Statutory Alignment:** Fulfills all criteria of Section 65B(2) of the Indian Evidence Act and Section 63 of Bharatiya Sakshya Adhiniyam 2023.
  - **Role of the Two Witnesses ("Panchas"):**
    - Independent witnesses observe the seizure contemporaneously.
    - System records timestamps and device details in their presence.
  - **Automated Certificate Generation:**
    - Generates statutory declaration stating the device was operating properly without interference.
    - Incorporates individual signature lines for the Examiner, Panch 1, and Panch 2 on all reports.
  - **Verification QR Code:** Embedded SVG QR code encodes the Case ID and the master SHA-256 hash of `hashes.csv`, allowing judges or opposing counsel to verify integrity with a single scan.
- **Suggested Visual / Diagram:** Side-by-side view: (Left) The Section 65B / Section 63 statutory requirements table; (Right) A sample preview of the generated Panchnama certificate showing the 3 signature blocks and QR code.
- **Presenter Notes:**  
  _"In court, electronic evidence is inadmissible without a Section 65B certificate. SocialParse automates the entire Panchnama workflow: it compiles the certificate, lists all seized items in a cryptographic appendix, provides signature blocks for the examiner and two independent witnesses, and embeds an offline verification QR code."_

---

## Slide 8: Security, Audit Log & Evidence Integrity

- **Slide Title:** Cryptographic Integrity & Hash-Chained Audit Ledger
- **Main Talking Points:**
  - **SHA-256 Immutability:** Every screenshot is hashed immediately upon capture; hashes are preserved across all manifests.
  - **Cryptographic Hash-Chaining (`audit_log.jsonl`):**
    - Each audit event includes the SHA-256 of the entire previous line (`prev_hash`).
    - Event content is serialized into Canonical JSON before calculating `event_hash`.
    - Line 1 points to `0000...0000` (ZERO_HASH).
  - **Comprehensive 8-Step Verification (`verifyCase()`):**
    - Validates directory structure, JSON schemas, flat CSV matches, unlisted files, and audit chain continuity.
    - Any modified byte, deleted screenshot, or edited timestamp immediately breaks the hash chain and is flagged.
- **Suggested Visual / Diagram:** Blockchain-style block diagram showing how `Event N` incorporates `Hash(Event N-1)`, demonstrating how modifying any single character invalidates all subsequent hashes.
- **Presenter Notes:**  
  _"Our primary technical innovation is the cryptographic audit ledger. Much like a blockchain, every single line in audit_log.jsonl incorporates the hash of the preceding line. If anyone attempts to alter a timestamp or swap a screenshot file, the hash chain breaks instantly, and our verification tool pinpoints the exact file and line that was tampered with."_

---

## Slide 9: Limitations & Future Scope

- **Slide Title:** Current Limitations & Future Roadmap
- **Main Talking Points:**
  - **Current System Limitations:**
    - Physical Android device requires manual enablement of Accessibility service permissions.
    - Android `FLAG_SECURE` prevents capturing certain private chats (flagged automatically, but requires external camera backup).
    - Desktop worker currently optimized for macOS and Linux.
  - **Future Scope & Engineering Roadmap:**
    - **Windows Support:** Expanding desktop app to Windows via React Native Windows.
    - **Hardware Optical Capture Rig:** Integrating an automated external camera mount for automated capture of `FLAG_SECURE` screens.
    - **Encrypted Enclaves:** Hardware security module (HSM) or Android StrongBox key signing for evidence archives.
    - **Direct Case Management System Integration:** Seamless export to CCTNS (Crime and Criminal Tracking Network & Systems) and ICJS.
- **Suggested Visual / Diagram:** A 2-column comparison table: "Completed in Present Major Project" vs. "Future Engineering Enhancements".
- **Presenter Notes:**  
  _"While SocialParse solves the core problem completely, we recognize realistic boundaries. When an app enforces FLAG_SECURE, the OS returns black pixels; our tool detects and logs this, alerting the officer to photograph the screen physically. In the future, we plan to support Windows via React Native Windows and integrate directly with national criminal tracking networks like CCTNS."_

---

## Slide 10: Conclusion & Live Demonstration

- **Slide Title:** Conclusion & Live System Demonstration
- **Main Talking Points:**
  - **Project Achievements:**
    - Fully operational monorepo with 140 automated tests passing across Core and Desktop.
    - Working Android mobile capture with pause, resume, ZIP export, and on-device PDF generation.
    - Full compliance with Indian digital evidence statutes (Section 65B IEA / Section 63 BSA).
    - Production-grade GitHub Actions CI pipeline running lint, typecheck, and E2E tests on every commit.
  - **Live Demo Flow:**
    1. Registering a new case (`CASE-2026-8888`) on the Desktop Workstation.
    2. Simulating feed capture across Instagram and Facebook.
    3. Triggering the 8-step `verifyCase()` integrity audit.
    4. Viewing the generated certified Panchnama HTML report with QR code.
- **Suggested Visual / Diagram:** "Live Demonstration" title slide with QR code linking to the GitHub repository and demonstration report artifact.
- **Presenter Notes:**  
  _"In conclusion, SocialParse transforms digital evidence collection from an error-prone manual chore into a legally airtight, automated forensic process. We will now begin our live demonstration of the software. Thank you, and we welcome your questions."_
