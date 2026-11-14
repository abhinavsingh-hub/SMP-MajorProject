# SocialParse: Forensic Examiner & User Operations Guide

> **Standard Operating Procedure (SOP) for Digital Evidence Capture & Panchnama Generation**  
> **Legal Compliance:** Section 65B of the Indian Evidence Act, 1872 & Section 63 of Bharatiya Sakshya Adhiniyam, 2023 (BSA)

---

## 1. Application Overview

**SocialParse** is a digital evidence acquisition and parsing tool designed for forensic examiners and police investigators. It enables automated harvesting of target social media accounts (Instagram, Facebook, Twitter/X, Telegram, WhatsApp, and Google) while maintaining an unbroken cryptographic chain of custody.

The software operates across two interfaces sharing a single forensic engine (`@smp/core`):

1. **Desktop Forensic Workstation (`apps/desktop`):** For lab-based investigation, FIR registration, Playwright automated feed harvesting, and HTML report certification.
2. **Mobile Forensic Capture App (`apps/mobile`):** For field investigation on physical Android devices where two-factor authentication (2FA) or mobile-only apps (WhatsApp, Telegram) require on-device acquisition.

---

## 2. Getting Started

### 2.1 Starting the Desktop Workstation

1. Open terminal in the project directory:
   ```bash
   cd SMP-MajorProject
   ```
2. Start the desktop interface:
   ```bash
   npm run start -w @smp/desktop
   ```
3. The desktop interface displays the primary sidebar navigation: **Dashboard (Home)**, **New Case**, **Capture Feed**, and **Report & Cert**.

### 2.2 Starting the Android Application

1. Connect an Android device (with USB Debugging enabled) or start an Android 14 (`arm64-v8a`) emulator.
2. Start the React Native bundler and compile the APK:
   ```bash
   # Terminal Tab 1
   npm run start -w mobile

   # Terminal Tab 2
   npm run android -w mobile
   ```
3. Grant required Android permissions:
   - **Accessibility Service:** Go to _Settings → Accessibility → Installed Apps → SocialParse Capture Service → Enable_. (Required for automated feed scrolling).
   - **MediaProjection / Screen Recording:** When prompted on first capture, tap **"Start now"** to allow high-resolution screenshot acquisition.

---

## 3. Case Registration (Step-by-Step)

Before any social media account is navigated, an official case repository must be registered.

1. Open **New Case** from the navigation bar.
2. Complete the required case metadata fields:
   - **Case / FIR Number:** Official police FIR or Crime Register number (e.g., `FIR-102/2026` or `CR-542/2026`).
   - **Examiner Name & Designation:** Full name and rank of the investigating officer (e.g., `Inspector Rajesh Sharma`, `Cyber Forensics Examiner`).
   - **Investigating Agency:** Police station or central unit (e.g., `Special Cell, Cyber Crime Unit, Delhi Police`).
   - **Accused Name / Profile:** Name of suspect or target handle (e.g., `Suresh Patel` or `Unknown Suspect`).
   - **Device Identifier:** Exact machine or phone profile (e.g., `Lab Mac Mini M2 - Lab-04` or `Pixel 7 Pro - Seized Item A`).
   - **Case Storage Directory:** Target folder on disk (defaults to `/tmp/smp_cases` or your configured case directory).
   - **Remarks / Incident Notes:** Context of seizure (e.g., `Suspect account analysis under Section 65B IEA / Section 63 BSA`).
3. Click **"Create Case Folder & Metadata"**.
4. The system validates the inputs using strict Zod schemas and creates the case directory on disk:
   ```text
   CASE-2026-0001/
   ├── case.json          # Form details with ISO 8601 UTC timestamp
   ├── manifest.json      # Initial empty evidence catalog
   ├── hashes.csv         # Standard CSV header
   └── audit_log.jsonl    # Line 1: case_created event linked to ZERO_HASH
   ```

---

## 4. Understanding the Panchnama Workflow

In Indian legal practice, an electronic **Panchnama** (seizure memo) documents the search, retrieval, and seizure of digital evidence conducted in the presence of **two independent, respectable witnesses ("Panchas")**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     THE 5-STAGE PANCHNAMA LIFECYCLE                    │
├────────────────────────────────────────────────────────────────────────┤
│ 1. INITIATION     │ Examiner introduces Panchas. Device state and      │
│                   │ FIR details are recorded in case.json.             │
│ 2. SEIZURE        │ Social media feed is navigated. Automated captures │
│                   │ take screenshots and immediately compute SHA-256.  │
│ 3. HASH CHAINING  │ Every item captured creates an immutable event in  │
│                   │ audit_log.jsonl referencing prior event hash.      │
│ 4. INTEGRITY CHECK│ verifyCase() executes 8 cryptographic audits.      │
│ 5. CERTIFICATION  │ Section 65B / Section 63 BSA certificate printed.  │
│                   │ Examiner and both Panchas physically/digitally sign│
└────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Panchnama Execution

1. **Presence of Witnesses:** Ensure Panch 1 and Panch 2 are present before the screen is turned on. Record their names and identity documents in the incident notes.
2. **Isolation:** On physical phones, verify SIM status and connect only to authorized investigative Wi-Fi.
3. **Opening the Feed:** Launch the target profile/feed.
4. **Execution:** Engage the automated capture script or examiner-assisted manual capture.
5. **Instant Hashing:** For every screenshot taken, the software immediately calculates its SHA-256 hash before saving any subsequent frame.
6. **Closing the Panchnama:** At the conclusion of capture, run the built-in integrity verification check. Print or export the HTML/PDF report. The examiner and both panchas sign the certification block on each page.

---

## 5. Evidence Capture Operations

### 5.1 Desktop Capture

1. Navigate to **Capture Feed** in the desktop application.
2. Select target platforms by checking the appropriate boxes:
   - `[x] Facebook`
   - `[x] Instagram`
   - `[x] Twitter / X`
   - `[x] Google`
3. Click **"Start Capture Session"**.
4. The system sends a `start` message over WebSocket (`ws://127.0.0.1:8765`) to the capture worker.
5. **Handling User Interventions (`needs_user`):**
   - If an account requires login, OTP, or CAPTCHA resolution, the screen displays a high-visibility yellow banner:  
     `⚠️ User Action Required: Please log in to Instagram in the browser window.`
   - Complete the login directly in the opened browser window.
   - The worker automatically detects session completion and resumes feed harvesting without requiring button clicks in the desktop app.

### 5.2 Mobile Capture (Pause, Resume & Stop)

1. On the mobile app **Home Screen**, enter or select the active `Case ID`.
2. Tap **"Configure Capture Run"**.
3. Select target social app (e.g. `Instagram` or `Facebook`).
4. Tap **"Start Capture"**. The screen will switch to the target social media app.
5. **Floating / In-App Controls:**
   - **Pause Capture:** Tap **Pause** at any point. The capture loop safely halts after the current screenshot completes, writing a `capture_paused` event into `audit_log.jsonl`.
   - **Resume Capture:** Tap **Resume**. The runner verifies the last completed item and continues from that exact position (`run_resumed` audit event).
   - **Stop Capture:** Tap **Stop**. The runner concludes the session, verifies total item counts, and commits the `capture_finished` audit log entry.

---

## 6. Report Generation & Panchnama Certification

### 6.1 Desktop HTML Report

1. Navigate to **Report & Cert** in the desktop app.
2. Select **"Generate Section 65B Panchnama"**.
3. The software renders a standalone, self-contained HTML document containing:
   - **Government Header & FIR Details:** Case number, examiner details, agency, date, and hardware profile.
   - **Table of Contents & Platform Summaries:** Number of captured items and timestamps per platform.
   - **Evidence Screenshots & Captions:** High-resolution screenshots with item ID, capture UTC timestamp, file path, and SHA-256 digest.
   - **Hash Table Appendix:** Complete tabular register of all files, byte sizes, and SHA-256 checksums, plus the SHA-256 hash of `hashes.csv`.
   - **Section 65B / 63 BSA Certification Block:** Formal statutory declaration with three signature areas:
     - _Signature of Forensic Examiner (with Rank & Agency)_
     - _Signature of Independent Witness 1 (Panch 1)_
     - _Signature of Independent Witness 2 (Panch 2)_
   - **Verification QR Code:** Embedded SVG QR code containing the `case_id` and the SHA-256 digest of `hashes.csv` for mobile scanning in court.
   - **Watermark Overlay:** Optional diagonal watermark (e.g., `CONFIDENTIAL FORENSIC COPY`).

### 6.2 Mobile On-Device PDF Generation

1. In the mobile app, tap **"Generate PDF Report"**.
2. The app compiles the HTML template directly on the device using `react-native-html-to-pdf`.
3. The resulting PDF is stored in the case directory and accompanied by an automatic `report_generated` audit log entry.

---

## 7. Exporting Cases & Sharing

### 7.1 Exporting a Case on Android

Per `docs/EXPORT_ANDROID.md`:

1. Tap **"Export Case Archive"** in the mobile app.
2. The application runs `verifyCase()` to verify all files are intact.
3. Upon passing, it records a `case_exported` event in `audit_log.jsonl`.
4. It compresses the case into a ZIP archive:  
   `CASE-2026-0001_20261114T103000Z.zip`
5. It computes the SHA-256 of the ZIP file and writes an adjacent checksum sidecar file:  
   `CASE-2026-0001_20261114T103000Z.zip.sha256`

### 7.2 Pulling Exports via Terminal (ADB)

To transfer the exported archive to an examiner workstation:

```bash
adb pull /sdcard/Android/data/com.socialparse.mobile/files/exports ./exports
```

Verify the archive against the sidecar:

```bash
cd exports
shasum -a 256 -c CASE-2026-0001_*.zip.sha256
```

### 7.3 Android Native Share Sheet

Tapping **"Share Report / Case"** triggers the native Android sharing dialog (`react-native-share`). The examiner can securely transfer the verified PDF report or ZIP package via AirDrop-equivalent, Bluetooth, USB transfer, or secure agency email.

---

## 8. Understanding the Audit Log (`audit_log.jsonl`)

The audit log is an append-only JSON Lines file located at the root of every case folder. It serves as an immutable forensic diary.

### Hash Chaining Mechanism

Every single line contains:

- `seq`: Monotonically increasing sequence number starting at `1`.
- `timestamp`: Exact ISO 8601 UTC timestamp ending in `Z`.
- `actor`: Who triggered the event (`examiner`, `capture_worker`, `android_app`, `desktop_app`, or `system`).
- `event_type`: What happened (e.g. `case_created`, `capture_started`, `item_captured`, `case_exported`).
- `details`: Context-specific key-value payload.
- `prev_hash`: The SHA-256 digest of the previous line (Line 1 uses 64 zeros `0000...0000`).
- `event_hash`: The SHA-256 digest calculated over canonical JSON of the current event.

```text
Line 1: seq=1  prev_hash=00000000...  event_hash=5a2f... (case_created)
Line 2: seq=2  prev_hash=5a2f...      event_hash=9b1c... (capture_started)
Line 3: seq=3  prev_hash=9b1c...      event_hash=e3d4... (item_captured)
Line 4: seq=4  prev_hash=e3d4...      event_hash=7f8a... (case_exported)
```

> **Why this matters in court:** If anyone modifies a timestamp, tampers with a file name, deletes an intermediate screenshot, or alters a detail, the cryptographic chain breaks from that line forward. Running `verifyCase()` flags the exact line and character where tampering occurred.

---

## 9. Important Precautions & Limitations

1. **Do Not Manually Edit Files in Case Directory:** Modifying any screenshot or editing `case.json` with a text editor will invalidate the hash register (`hashes.csv`) and fail the Section 65B audit check.
2. **Android `FLAG_SECURE` Screens:** Certain confidential chats (e.g. Telegram Secret Chats) enforce operating system screenshot blocks, resulting in solid black images. SocialParse's AI analyzer detects and flags these frames as `FLAG_SECURE_BLOCKED`. Examiners should photograph these screens using an external camera as a secondary physical annexure.
3. **Clock Synchronization:** Ensure the workstation or Android phone clock is synchronized with Network Time Protocol (NTP) before commencing capture, as all timestamps are recorded in strict UTC ISO 8601.
4. **Battery & Screen Timeout:** When capturing extensive timelines on Android, keep the phone connected to power and set display sleep to "Never" or use the built-in Keep-Awake toggle.
