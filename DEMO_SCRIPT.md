# SocialParse: 3-Minute Live Demonstration Script

> **Total Duration:** 3 Minutes (180 Seconds)  
> **Presenter:** Forensic Project Lead / Demonstrator  
> **Environment:** macOS Laptop with Terminal, Web Browser, and SocialParse Desktop & Mobile Applications

---

## Timeline & Scene Overview

```
[0:00 - 0:30]  Scene 1: Introduction & The Core Problem
[0:30 - 1:00]  Scene 2: Monorepo & Application Overview
[1:00 - 1:45]  Scene 3: Live Case Registration & Setup
[1:45 - 2:30]  Scene 4: Automated Capture, Verification & Panchnama Report
[2:30 - 3:00]  Scene 5: Legal Value, Limitations & Conclusion
```

---

### Scene 1: Introduction & The Core Problem (0:00 – 0:30)

- **What to Click / Show on Screen:**
  - Display the project title slide or the GitHub repository root (`https://github.com/abhinavsingh-hub/SMP-MajorProject`).
  - Terminal open at `~/Desktop/SMP-MajorProject`.
- **What to Say:**
  _"Good morning. When police or cybercrime investigators seize a suspect's phone or computer, documenting social media feeds is one of their most urgent tasks. Currently, officers take manual screenshots, paste them into Word documents, and try to write a seizure memo called a Panchnama._

  _In court, this evidence is routinely torn apart by the defense: 'Who took this screenshot? What was the exact second? Was this image edited?' Under Section 65B of the Indian Evidence Act and the new Section 63 of Bharatiya Sakshya Adhiniyam, digital evidence must be proved mathematically tamper-free. That is what SocialParse automates."_

- **Expected Screen / Output:**
  - Clean repository view showing monorepo structure.

---

### Scene 2: Monorepo & Application Overview (0:30 – 1:00)

- **What to Click / Show on Screen:**
  - Open terminal and run:
    ```bash
    npm test
    ```
  - While tests run, highlight the clean architecture: `packages/core` (evidentiary rules), `apps/desktop` (workstation UI), `apps/mobile` (Android capture), and `packages/ai-analyzer` (multimodal OCR & findings).
- **What to Say:**
  _"SocialParse is built as an npm monorepo with platform-independent core logic. All 140 automated tests—including cryptographic hash chaining and end-to-end simulated Android export/import—pass cleanly in seconds._

  _The system works seamlessly across both desktop browsers and Android devices, guaranteeing that evidence collected on a mobile phone can be transferred to a lab workstation without breaking the chain of custody."_

- **Expected Screen / Output:**
  - Terminal displays:
    ```text
    ✔ 140 passed across 21 suites (0 failing)
    ```

---

### Scene 3: Live Case Registration & Setup (1:00 – 1:45)

- **What to Click / Show on Screen:**
  - Launch or switch to the **SocialParse Desktop Interface**:
    - Click **"New Case"** on the sidebar navigation.
  - Fill in realistic forensic details into the form:
    - _Case / FIR Number:_ `FIR-102/2026`
    - _Examiner Name:_ `Inspector Rajesh Sharma`
    - _Examiner Designation:_ `Cyber Forensics Examiner`
    - _Accused Name:_ `Suresh Patel`
    - _Agency:_ `Special Cell, Cyber Crime Unit`
    - _Device Identifier:_ `Workstation-01 (macOS)`
    - _Remarks:_ `Seizure conducted under Section 65B IEA / Section 63 BSA`
  - Click **"Create Case Folder & Metadata"**.
- **What to Say:**
  _"Let's demonstrate a live case. We register FIR 102/2026. Notice we capture the examiner's name, investigating agency, suspect details, and hardware identifier._

  _When I click 'Create Case Folder', the system validates every field using Zod schemas and immediately provisions the case repository on disk: creating `case.json`, an empty `manifest.json`, the flat `hashes.csv`, and initializing `audit_log.jsonl` with an immutable genesis event."_

- **Expected Screen / Output:**
  - Green Success Banner appears:
    ```text
    ✓ Case Created Successfully
    Case ID: CASE-2026-0001
    Path: /tmp/smp_cases/CASE-2026-0001
    ```
  - Click **"Proceed to Evidence Capture →"**.

---

### Scene 4: Automated Capture, Verification & Panchnama Report (1:45 – 2:30)

- **What to Click / Show on Screen:**
  - On the **Capture Screen**:
    - Check target platforms: `[x] Facebook`, `[x] Instagram`, `[x] Twitter / X`.
    - Click **"Start Capture Session"**.
  - Show the live streaming logs and progress bar advancing to 100%. Point out:
    - Live protocol events (`PROGRESS`, `ITEM`, `DONE`).
    - The `needs_user` action alert box demonstrating how login barriers and 2FA are handled gracefully.
  - Open terminal and demonstrate the self-contained demonstration report generation:
    ```bash
    node --experimental-strip-types -e "import { buildDemoReportHtml } from './packages/core/src/index.ts'; import fs from 'node:fs'; fs.writeFileSync('docs/demo-report.html', buildDemoReportHtml({ watermark: 'COURT COPY' }));"
    open docs/demo-report.html
    ```
- **What to Say:**
  _"Now we trigger evidence capture. The worker streams real-time protocol events: recording the item ID, relative path, and SHA-256 hash for every screenshot._

  _If a social network requests an OTP or login, the tool displays an alert, pauses, and resumes automatically once the user finishes._

  _Next, let's open the resulting forensic deliverable: the Section 65B Panchnama Report. Here is the formal government header, FIR details, the captured screenshots with exact timestamps and SHA-256 digests, and the cryptographic hash table appendix._

  _Crucially, at the bottom, we have the statutory Certificate of Authenticity with physical signature lines for the examiner and two independent witnesses ('Panchas'), alongside an embedded offline SVG QR code containing the case hash."_

- **Expected Screen / Output:**
  - Web browser displays `docs/demo-report.html`:
    - Government emblem / Case header.
    - Screenshot evidence cards with captions and hashes.
    - Full cryptographic Hash Table Appendix.
    - Section 65B / 63 BSA certificate block with 3 signature areas.
    - Scannable SVG QR Code and diagonal watermark.

---

### Scene 5: Legal Value, Limitations & Conclusion (2:30 – 3:00)

- **What to Click / Show on Screen:**
  - In terminal, run a tamper-test simulation to show how integrity verification works:
    ```bash
    node --experimental-strip-types --test packages/core/tests/verify.test.ts
    ```
- **What to Say:**
  _"What gives this true forensic value? If anyone tampers with even a single byte of a screenshot, alters a date, or deletes an audit line, our 8-step `verifyCase()` integrity check flags the mismatch instantly._

  _While physical Android devices require accessibility permission and `FLAG_SECURE` screens must be supplemented with external photography, SocialParse completely eliminates manual human error and provides an unbroken chain of custody._

  _SocialParse bridges the gap between cyber investigation and the courtroom. Thank you, and we are happy to answer any questions."_

- **Expected Screen / Output:**
  - Verification tests output showing clean passes on intact cases and immediate detection of tampered files:
    ```text
    ✔ passes cleanly on an intact, fully compliant case
    ✔ flags a tampered screenshot file (hash mismatch)
    ✔ flags a missing evidence file
    ```
