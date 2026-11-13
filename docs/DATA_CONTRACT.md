# SocialParse Data Contract

|                        |                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **Spec version**       | 1.0 (written in files as `"schema_version": "1.0"`)                                        |
| **Task**               | P3-02                                                                                      |
| **Owner**              | Person 3 (core library and desktop app)                                                    |
| **Used by**            | Person 1 (capture worker), Person 2 (Android app), Person 3 (core library and desktop app) |
| **Companion document** | [WORKER_PROTOCOL.md](WORKER_PROTOCOL.md)                                                   |

## 1. What this document is for

SocialParse captures screenshots from social media accounts and stores them as digital evidence for a case. Evidence is only useful if anyone can later prove **what was captured, when it was captured, and that nothing was changed afterwards**.

This document is the single agreement about **how evidence and case information are stored on disk**: the folder layout, the file names, and the four metadata files that every case folder contains. All three of us follow it exactly, so that our three modules fit together without surprises.

| Person   | Module                                | What this person must do with this document                                                                                                                                          |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Person 1 | Capture worker (Node.js + Playwright) | Save every screenshot in the right folder with the right file name (section 3) and report its SHA-256 hash to the desktop app (see [WORKER_PROTOCOL.md](WORKER_PROTOCOL.md)).        |
| Person 2 | Android app (React Native)            | Use the same folder layout, file names, platform IDs and rules for any case folder it creates. How data travels between the Android app and the desktop app is **not** defined here. |
| Person 3 | Core library and desktop app          | Create, write and verify `case.json`, `manifest.json`, `hashes.csv` and `audit_log.jsonl` (sections 4 to 8).                                                                         |

### Words you will see

| Word             | Meaning in plain language                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **SHA-256**      | A formula that turns any file into a 64-character "fingerprint". If even one byte of the file changes, the fingerprint changes completely. |
| **Hash**         | The fingerprint produced by SHA-256.                                                                                                       |
| **Append-only**  | You may only add new lines at the end of a file. You never edit or delete old lines.                                                       |
| **JSONL**        | "JSON Lines": a text file where every line is one complete JSON object.                                                                    |
| **ISO 8601 UTC** | A standard way of writing date and time that does not depend on time zones, for example `2026-11-12T09:31:58.311Z`.                        |
| **Case folder**  | The folder on disk that holds everything about one case.                                                                                   |
| **Item**         | One piece of captured evidence. At the moment, one item is one screenshot file.                                                            |

## 2. Rules that apply everywhere

These rules apply to every file and every message in the project, including the messages in [WORKER_PROTOCOL.md](WORKER_PROTOCOL.md).

### 2.1 Timestamps

- Every timestamp is **ISO 8601 in UTC** with exactly three millisecond digits and a trailing `Z`:
  `YYYY-MM-DDTHH:MM:SS.sssZ`, for example `2026-11-12T09:31:58.311Z`.
- In JavaScript or TypeScript, `new Date().toISOString()` produces exactly this format.
- Never use local time, never use offsets such as `+05:30`, and never leave out the milliseconds.
- **Only exception:** inside screenshot **file names** we use the compact form `YYYYMMDDTHHMMSSZ` (for example `20261112T093158Z`), because the character `:` is not allowed in file names on some systems. It is the same moment, only written without punctuation and without milliseconds.

### 2.2 Hashes

- The only hash algorithm is **SHA-256**.
- A hash is written as **64 lowercase hexadecimal characters** (`0-9` and `a-f`), for example `7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb`.
- A file hash is always calculated over the **raw bytes of the file**.
- Always use the field name `sha256` for a file hash.

### 2.2.1 Note about the examples in this document

The hashes in the examples are **illustrative**. They are not the hashes of real screenshot files, so you cannot reproduce them from a real PNG. The hash chain in section 7 is different: its values were calculated with the exact rules in this document, so you can use it to test your code.

### 2.3 Names and identifiers

| Thing                    | Rule                                                                                                                        | Example                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| JSON field names         | `snake_case` (lowercase words joined by `_`)                                                                                | `case_id`, `captured_at`     |
| Case ID (`case_id`)      | `CASE-YYYY-NNNN` (year, then a 4-digit number). It is also the **name of the case folder**.                                 | `CASE-2026-0042`             |
| Item ID (`item_id`)      | `ITEM-NNNN`. A counter that starts at `0001` and is shared by the whole case (all platforms together).                      | `ITEM-0001`                  |
| Platform ID (`platform`) | Lowercase letters and digits only                                                                                           | `instagram`, `facebook`, `x` |
| Section ID (`section`)   | Lowercase letters, digits and underscores only                                                                              | `profile`, `feed`            |
| Folder and file names    | Lowercase letters, digits, `_`, `-` and `.` only. No spaces. (The case folder name is the one exception: it is upper case.) | `instagram/screenshots/`     |

### 2.4 Paths

- Every `file_path` is **relative to the case folder**.
- Use forward slashes (`/`) on every operating system.
- Never start with `/` and never contain `..`.
- Example: `instagram/screenshots/instagram_profile_0001_20261112T093158Z.png`
- The only absolute path in the whole project is `case_folder` in the `start` message of the worker protocol.

### 2.5 File format

- Text files are UTF-8, with Unix line endings (`\n`) and no byte-order mark.
- `case.json` and `manifest.json` are pretty-printed with 2 spaces and end with a newline.
- `hashes.csv` and `audit_log.jsonl` end with a newline after the last line.

### 2.6 Missing values

- A required field is **never left out**.
- If a value genuinely does not exist, write `null` (not `""`, not `"N/A"`). The only exception is `remarks`, which is an empty string `""` when there is nothing to write.
- Readers must ignore fields they do not know, but writers must not add fields that are not in this document. If you need a new field, change this document first (see section 9).

### 2.7 Platform and section IDs used in this document

| Platform ID | Platform             |
| ----------- | -------------------- |
| `instagram` | Instagram            |
| `facebook`  | Facebook             |
| `x`         | X (formerly Twitter) |

| Section ID | What is captured                          |
| ---------- | ----------------------------------------- |
| `profile`  | The profile page of the logged-in account |
| `feed`     | The feed of the logged-in account         |

More platforms or sections can be added to these tables when all three of us agree. Nothing else has to change when a row is added.

## 3. Case folder structure

### 3.1 Layout

Every case has **one folder**, named after its `case_id`. The folder holds four metadata files and one sub-folder per platform that was captured.

```text
CASE-2026-0042/
├── case.json
├── manifest.json
├── hashes.csv
├── audit_log.jsonl
├── instagram/
│   └── screenshots/
│       ├── instagram_profile_0001_20261112T093158Z.png
│       └── instagram_feed_0002_20261112T093221Z.png
├── facebook/
│   └── screenshots/
│       ├── facebook_profile_0003_20261112T093403Z.png
│       └── facebook_feed_0004_20261112T093427Z.png
└── x/                      <- created only if X is captured
    └── screenshots/
```

Where the `cases` folder itself lives on the computer is decided by the desktop app and is not part of this contract. Everything below `CASE-2026-0042/` is.

### 3.2 What each part is

| Path inside the case folder | Created by                              | Purpose                                                             |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------------- |
| `case.json`                 | Desktop app                             | Information about the case: who, what, where (section 4).           |
| `manifest.json`             | Desktop app                             | The official list of all captured items (section 5).                |
| `hashes.csv`                | Desktop app                             | A flat list of file hashes, easy to open and compare (section 6).   |
| `audit_log.jsonl`           | Desktop app                             | The tamper-evident history of everything that happened (section 7). |
| `<platform>/`               | Capture worker (when it first needs it) | One folder per platform, named with the platform ID.                |
| `<platform>/screenshots/`   | Capture worker                          | The PNG screenshot files for that platform.                         |

All four metadata files are created **together, at the moment the case is created**:
`case.json` is filled in, `manifest.json` starts with an empty `items` list, `hashes.csv` starts with only its header row, and `audit_log.jsonl` starts with the `case_created` event.

### 3.3 Screenshot storage and naming convention

Screenshots are saved as **PNG files** in `<platform>/screenshots/`.

File name pattern:

```text
{platform}_{section}_{item_number}_{captured_utc}.png
```

| Part           | Meaning                                                                                                                | Example            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `platform`     | Platform ID                                                                                                            | `instagram`        |
| `section`      | Section ID                                                                                                             | `profile`          |
| `item_number`  | The number from the `item_id`, always 4 digits. It is shared by the whole case, so it keeps counting across platforms. | `0001`             |
| `captured_utc` | Time the screenshot was taken, compact UTC form (section 2.1)                                                          | `20261112T093158Z` |

Full example: `instagram_profile_0001_20261112T093158Z.png`

The checking pattern (regular expression) for a valid file name is:

```text
^[a-z0-9]+_[a-z0-9_]+_[0-9]{4,}_[0-9]{8}T[0-9]{6}Z\.png$
```

Rules:

1. The item number inside the file name must match the `item_id` (file `..._0001_...` is `ITEM-0001`).
2. The platform and section in the file name must match the `platform` and `section` fields of the item, and the folder the file is in.
3. The time in the file name is `captured_at` of the item, cut to whole seconds.
4. **Never rename, overwrite or delete** an evidence file. If something is captured again, it becomes a **new item** with a new number.
5. If a case ever needs more than 9999 items, the number just gets longer (`10000`).

| File name                                      | Valid? | Why                                                           |
| ---------------------------------------------- | ------ | ------------------------------------------------------------- |
| `instagram_feed_0002_20261112T093221Z.png`     | Yes    | Follows the pattern.                                          |
| `Instagram Profile 1.png`                      | No     | Capital letters, spaces, no number or time.                   |
| `instagram_feed_2_20261112T093221Z.png`        | No     | Item number must have 4 digits.                               |
| `instagram_feed_0002_2026-11-12T09:32:21Z.png` | No     | Time must be written in compact form, and `:` is not allowed. |

## 4. `case.json`

### 4.1 Purpose

`case.json` stores the information about the case itself. It is written once, when the case is created, and should be treated as read-only after the first capture starts.

### 4.2 Fields

| Field                  | Type   | Description                                                                      |
| ---------------------- | ------ | -------------------------------------------------------------------------------- |
| `schema_version`       | string | Always `"1.0"` for this version of the contract.                                 |
| `case_id`              | string | System ID of the case, format `CASE-YYYY-NNNN`. Same as the case folder name.    |
| `case_number`          | string | The official case or FIR number given by the agency. Free text, but never empty. |
| `examiner_name`        | string | Full name of the person doing the examination.                                   |
| `examiner_designation` | string | Rank or job title of the examiner.                                               |
| `accused_name`         | string | Name of the accused person.                                                      |
| `agency`               | string | Name of the agency or unit handling the case.                                    |
| `created_at`           | string | When the case was created (ISO 8601 UTC, section 2.1).                           |
| `device`               | object | The device used to run SocialParse for this case (see below).                    |
| `remarks`              | string | Free-text notes. Use `""` if there are none.                                     |

Fields of `device`:

| Field         | Type   | Description                                           |
| ------------- | ------ | ----------------------------------------------------- |
| `type`        | string | `"desktop"` or `"android"`.                           |
| `name`        | string | Name of the device (computer name or phone model).    |
| `os`          | string | Operating system name, for example `"macOS"`.         |
| `os_version`  | string | Operating system version.                             |
| `app_version` | string | Version of the SocialParse app that created the case. |

### 4.3 Example

```json
{
  "schema_version": "1.0",
  "case_id": "CASE-2026-0042",
  "case_number": "CCU/FIR/118/2026",
  "examiner_name": "Priya Deshmukh",
  "examiner_designation": "Sub-Inspector",
  "accused_name": "Sample Accused",
  "agency": "Example Cyber Crime Unit",
  "created_at": "2026-11-12T09:15:02.118Z",
  "device": {
    "type": "desktop",
    "name": "EXAMINER-MAC-01",
    "os": "macOS",
    "os_version": "14.5",
    "app_version": "0.1.0"
  },
  "remarks": "Sample case used for documentation only."
}
```

## 5. `manifest.json`

### 5.1 Purpose

`manifest.json` is the **official list of evidence items** in the case. If a file is not in the manifest, it is not part of the evidence. For each item it records where the file is, which platform and section it came from, when it was captured, and its SHA-256 hash.

### 5.2 Top-level fields

| Field            | Type   | Description                                                                        |
| ---------------- | ------ | ---------------------------------------------------------------------------------- |
| `schema_version` | string | Always `"1.0"`.                                                                    |
| `case_id`        | string | Same as in `case.json`.                                                            |
| `hash_algorithm` | string | Always `"SHA-256"`.                                                                |
| `created_at`     | string | When the manifest was created. Same moment as the case.                            |
| `updated_at`     | string | When the last item was added.                                                      |
| `items`          | array  | The evidence items, oldest first. Empty (`[]`) when nothing has been captured yet. |

### 5.3 Fields of each item

| Field             | Type    | Description                                                        |
| ----------------- | ------- | ------------------------------------------------------------------ |
| `item_id`         | string  | `ITEM-NNNN`, unique inside the case.                               |
| `platform`        | string  | Platform ID (section 2.7).                                         |
| `section`         | string  | Section ID (section 2.7).                                          |
| `file_path`       | string  | Path of the screenshot, relative to the case folder (section 2.4). |
| `file_size_bytes` | integer | Size of the file in bytes.                                         |
| `sha256`          | string  | SHA-256 hash of the file (section 2.2).                            |
| `captured_at`     | string  | When the screenshot was taken (ISO 8601 UTC).                      |

### 5.4 Example

This is the manifest after the sample capture session described in [WORKER_PROTOCOL.md](WORKER_PROTOCOL.md) finished.

```json
{
  "schema_version": "1.0",
  "case_id": "CASE-2026-0042",
  "hash_algorithm": "SHA-256",
  "created_at": "2026-11-12T09:15:02.118Z",
  "updated_at": "2026-11-12T09:34:27.991Z",
  "items": [
    {
      "item_id": "ITEM-0001",
      "platform": "instagram",
      "section": "profile",
      "file_path": "instagram/screenshots/instagram_profile_0001_20261112T093158Z.png",
      "file_size_bytes": 482113,
      "sha256": "db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376",
      "captured_at": "2026-11-12T09:31:58.311Z"
    },
    {
      "item_id": "ITEM-0002",
      "platform": "instagram",
      "section": "feed",
      "file_path": "instagram/screenshots/instagram_feed_0002_20261112T093221Z.png",
      "file_size_bytes": 391840,
      "sha256": "1071ed51cec7821291b6ea25cbf6a651185eef697b5eac6199d9a7ad656e4324",
      "captured_at": "2026-11-12T09:32:21.640Z"
    },
    {
      "item_id": "ITEM-0003",
      "platform": "facebook",
      "section": "profile",
      "file_path": "facebook/screenshots/facebook_profile_0003_20261112T093403Z.png",
      "file_size_bytes": 455207,
      "sha256": "a6a9af4e85fa76d00a927cf62b0170d4a5208f61eda9c35aa9494bbfb84fe7fc",
      "captured_at": "2026-11-12T09:34:03.077Z"
    },
    {
      "item_id": "ITEM-0004",
      "platform": "facebook",
      "section": "feed",
      "file_path": "facebook/screenshots/facebook_feed_0004_20261112T093427Z.png",
      "file_size_bytes": 402968,
      "sha256": "567bc74bd1eb3541522088cd1df4c5b54c9d4c516c2af50ae61742df69b7823b",
      "captured_at": "2026-11-12T09:34:27.953Z"
    }
  ]
}
```

### 5.5 Rules

1. Items are only **added**, in order of `item_id`. An existing item is never edited or removed.
2. Every item must have a matching row in `hashes.csv` and a matching `item_captured` event in `audit_log.jsonl`.
3. `updated_at` is set every time an item is added.

## 6. `hashes.csv`

### 6.1 Purpose

`hashes.csv` is a simple, flat list of file hashes. It is easy to open in Excel, Numbers or a text editor, and easy to compare with the output of a hash tool. It repeats information from `manifest.json` on purpose: **two separate lists must always agree**, so a change made in only one of them is detected during verification (section 8).

### 6.2 Columns

| Column        | Same as manifest field | Description                                   |
| ------------- | ---------------------- | --------------------------------------------- |
| `item_id`     | `item_id`              | Item ID.                                      |
| `platform`    | `platform`             | Platform ID.                                  |
| `section`     | `section`              | Section ID.                                   |
| `file_path`   | `file_path`            | Path relative to the case folder.             |
| `sha256`      | `sha256`               | SHA-256 hash of the file.                     |
| `captured_at` | `captured_at`          | When the screenshot was taken (ISO 8601 UTC). |

### 6.3 Example

```csv
item_id,platform,section,file_path,sha256,captured_at
ITEM-0001,instagram,profile,instagram/screenshots/instagram_profile_0001_20261112T093158Z.png,db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376,2026-11-12T09:31:58.311Z
ITEM-0002,instagram,feed,instagram/screenshots/instagram_feed_0002_20261112T093221Z.png,1071ed51cec7821291b6ea25cbf6a651185eef697b5eac6199d9a7ad656e4324,2026-11-12T09:32:21.640Z
ITEM-0003,facebook,profile,facebook/screenshots/facebook_profile_0003_20261112T093403Z.png,a6a9af4e85fa76d00a927cf62b0170d4a5208f61eda9c35aa9494bbfb84fe7fc,2026-11-12T09:34:03.077Z
ITEM-0004,facebook,feed,facebook/screenshots/facebook_feed_0004_20261112T093427Z.png,567bc74bd1eb3541522088cd1df4c5b54c9d4c516c2af50ae61742df69b7823b,2026-11-12T09:34:27.953Z
```

### 6.4 Rules

1. The first line is always the header row, exactly as shown above.
2. One row per manifest item, in `item_id` order, comma-separated, no spaces around commas.
3. Our naming rules (section 2.3 and 3.3) never allow commas or quotes in any value, so no quoting is needed.
4. Rows are only added at the end. Existing rows are never changed.

### 6.5 Checking one hash by hand

Open a terminal in the case folder and run the command for your system, then compare the result with the `sha256` column.

```bash
# macOS
shasum -a 256 instagram/screenshots/instagram_profile_0001_20261112T093158Z.png

# Linux
sha256sum instagram/screenshots/instagram_profile_0001_20261112T093158Z.png
```

```powershell
# Windows PowerShell (prints upper case, so make it lower case)
(Get-FileHash -Algorithm SHA256 .\instagram\screenshots\instagram_profile_0001_20261112T093158Z.png).Hash.ToLower()
```

## 7. `audit_log.jsonl`

### 7.1 Purpose

The audit log is the **diary of the case**. Every important thing that happens (case created, capture started, login needed, screenshot captured, errors, checks) is written as one new line. Because the lines are linked together with hashes (section 7.4), nobody can quietly change or remove an old line without it being noticed.

### 7.2 Append-only rule

- The file is **append-only**: new events are added at the end, old lines are **never edited, re-ordered or deleted**.
- If a line turns out to be wrong, do not fix it. Add a new event that explains the situation.
- Only the desktop app (core library) writes this file. The worker never touches it; it only sends messages, and the desktop app records them.
- Each line is one complete JSON object on **one line**.

### 7.3 Fields of each line

| Field        | Type    | Description                                                                                                     |
| ------------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| `seq`        | integer | Event number: `1` for the first line, then `2`, `3`, ... with no gaps.                                          |
| `timestamp`  | string  | When the event happened (ISO 8601 UTC).                                                                         |
| `actor`      | string  | Who caused the event: `examiner` (a person pressed a button), `desktop_app`, `capture_worker` or `android_app`. |
| `event_type` | string  | What happened (table below).                                                                                    |
| `details`    | object  | Extra facts about the event. The fields depend on `event_type`.                                                 |
| `prev_hash`  | string  | The `event_hash` of the previous line. For line 1 it is 64 zeros.                                               |
| `event_hash` | string  | SHA-256 hash of this line (explained in section 7.4).                                                           |

Event types:

| `event_type`           | `actor`                           | Written when                                                                                                                       | Fields inside `details`                                                                                      |
| ---------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `case_created`         | `examiner`                        | The case is created.                                                                                                               | `case_number`, `examiner_name`                                                                               |
| `capture_started`      | `examiner`                        | The examiner starts a capture (`start` message sent).                                                                              | `platforms`, `sections`                                                                                      |
| `user_action_required` | `capture_worker`                  | A `needs_user` message arrives.                                                                                                    | `platform`, `section`, `reason`                                                                              |
| `capture_resumed`      | `capture_worker`                  | The worker continues after the person finished the action (a `progress` message with status `running` arrives after `needs_user`). | `platform`, `section`                                                                                        |
| `item_captured`        | `capture_worker`                  | An `item` message arrived and its hash was verified.                                                                               | `item_id`, `platform`, `section`, `file_path`, `sha256`                                                      |
| `item_rejected`        | `desktop_app`                     | An `item` message failed verification.                                                                                             | `item_id`, `file_path`, `reason` (`"hash_mismatch"`, `"file_missing"`, `"invalid_path"` or `"invalid_name"`) |
| `capture_error`        | `capture_worker` or `desktop_app` | An `error` message arrives (or the desktop app detects a problem itself).                                                          | `code`, `message`, `platform`, `section`, `fatal`                                                            |
| `capture_finished`     | `capture_worker`                  | A `done` message arrives.                                                                                                          | `status`, `items_captured`, `errors`                                                                         |
| `case_exported`        | `android_app`                     | A verified case is prepared for export.                                                                                            | `zip_path`                                                                                                   |
| `report_generated`     | `android_app`                     | A PDF report is generated; the report includes the case integrity result.                                                         | `path`, `sha256`                                                                                             |
| `integrity_check`      | `desktop_app`                     | The integrity check of section 8 is run.                                                                                           | `result` (`"pass"` or `"fail"`), `items_checked`, `issues` (a list; empty when passed)                       |

The `timestamp` of an event is the moment the desktop app wrote it. (The capture time of a screenshot is stored separately, as `captured_at` in the manifest.)

### 7.4 Hash chaining

Each line contains two hashes:

- `prev_hash`: the `event_hash` of the line before it.
- `event_hash`: the hash of the current line, **which includes `prev_hash`**.

```text
Line 1                    Line 2                    Line 3
prev_hash = 000...000     prev_hash = hash of 1     prev_hash = hash of 2
event_hash = H1  ───────► event_hash = H2  ───────► event_hash = H3
```

Because line 2 contains the hash of line 1, and line 3 contains the hash of line 2, changing **any** old line changes its hash, which no longer matches the `prev_hash` stored in the next line. The chain breaks at exactly that place, so tampering is visible. Deleting or re-ordering lines breaks the chain too.

How to calculate `event_hash` for a line:

1. Take the event as a JSON object **without** the `event_hash` field (keep `prev_hash`).
2. Turn it into **canonical JSON**: sort the keys alphabetically at every level, use no spaces and no line breaks (`,` and `:` only), and encode as UTF-8. Every program therefore produces exactly the same bytes.
3. Calculate SHA-256 of those bytes and write it as 64 lowercase hex characters.
4. Add it to the event as `event_hash` and write the line.

How to add a new event:

1. Read the last line of the file and take its `event_hash`. If the file is empty, use 64 zeros.
2. Build the event with `seq` = last `seq` + 1 and that value as `prev_hash`.
3. Calculate `event_hash` (steps above).
4. Append the line followed by `\n`.

Worked example for line 1 (the first event of the sample below). Its canonical form is:

```text
{"actor":"examiner","details":{"case_number":"CCU/FIR/118/2026","examiner_name":"Priya Deshmukh"},"event_type":"case_created","prev_hash":"0000000000000000000000000000000000000000000000000000000000000000","seq":1,"timestamp":"2026-11-12T09:15:02.118Z"}
```

The SHA-256 of exactly that text is:

```text
7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb
```

and this value is the `prev_hash` of line 2.

### 7.5 Example

This is the complete audit log of the sample capture session. Every example in this document and in [WORKER_PROTOCOL.md](WORKER_PROTOCOL.md) describes this same case (`CASE-2026-0042`). The last line is written after the integrity check of section 8 was run.

```jsonl
{"seq": 1, "timestamp": "2026-11-12T09:15:02.118Z", "actor": "examiner", "event_type": "case_created", "details": {"case_number": "CCU/FIR/118/2026", "examiner_name": "Priya Deshmukh"}, "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000", "event_hash": "7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb"}
{"seq": 2, "timestamp": "2026-11-12T09:30:10.004Z", "actor": "examiner", "event_type": "capture_started", "details": {"platforms": ["instagram", "facebook"], "sections": ["profile", "feed"]}, "prev_hash": "7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb", "event_hash": "e8ef56c2ed865f31bcffe78f1c119dd5b030a2fca5dcad44e08b7f2b038b3572"}
{"seq": 3, "timestamp": "2026-11-12T09:30:12.530Z", "actor": "capture_worker", "event_type": "user_action_required", "details": {"platform": "instagram", "section": null, "reason": "login"}, "prev_hash": "e8ef56c2ed865f31bcffe78f1c119dd5b030a2fca5dcad44e08b7f2b038b3572", "event_hash": "bc77e33b6e37b35b74593733f40783f45099ed7bc9c192906f8951a0acadf1a2"}
{"seq": 4, "timestamp": "2026-11-12T09:31:44.907Z", "actor": "capture_worker", "event_type": "capture_resumed", "details": {"platform": "instagram", "section": "profile"}, "prev_hash": "bc77e33b6e37b35b74593733f40783f45099ed7bc9c192906f8951a0acadf1a2", "event_hash": "6097b64224100fec971a21635868ee5ac64564bc74b4a03f8065056644cabd80"}
{"seq": 5, "timestamp": "2026-11-12T09:31:58.352Z", "actor": "capture_worker", "event_type": "item_captured", "details": {"item_id": "ITEM-0001", "platform": "instagram", "section": "profile", "file_path": "instagram/screenshots/instagram_profile_0001_20261112T093158Z.png", "sha256": "db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376"}, "prev_hash": "6097b64224100fec971a21635868ee5ac64564bc74b4a03f8065056644cabd80", "event_hash": "b4c3ad1cf4dbf9daba355ed72d677d7c954210d8b71e576d0349b11ba568fdc9"}
{"seq": 6, "timestamp": "2026-11-12T09:32:21.688Z", "actor": "capture_worker", "event_type": "item_captured", "details": {"item_id": "ITEM-0002", "platform": "instagram", "section": "feed", "file_path": "instagram/screenshots/instagram_feed_0002_20261112T093221Z.png", "sha256": "1071ed51cec7821291b6ea25cbf6a651185eef697b5eac6199d9a7ad656e4324"}, "prev_hash": "b4c3ad1cf4dbf9daba355ed72d677d7c954210d8b71e576d0349b11ba568fdc9", "event_hash": "462b058538cad1196be940c0360b3449dace175d4aa0fe8a7e6ac77d8cf670ad"}
{"seq": 7, "timestamp": "2026-11-12T09:32:30.115Z", "actor": "capture_worker", "event_type": "user_action_required", "details": {"platform": "facebook", "section": null, "reason": "login"}, "prev_hash": "462b058538cad1196be940c0360b3449dace175d4aa0fe8a7e6ac77d8cf670ad", "event_hash": "e6a3e1dd9eadb68f0fada05fa951be0022b7463a44c0de4a8934e0827782a034"}
{"seq": 8, "timestamp": "2026-11-12T09:33:50.602Z", "actor": "capture_worker", "event_type": "capture_resumed", "details": {"platform": "facebook", "section": "profile"}, "prev_hash": "e6a3e1dd9eadb68f0fada05fa951be0022b7463a44c0de4a8934e0827782a034", "event_hash": "a7318c3f6199135ee71133c38d3c71a8fb3af33ae65f84f4fd862f43c94be764"}
{"seq": 9, "timestamp": "2026-11-12T09:34:03.120Z", "actor": "capture_worker", "event_type": "item_captured", "details": {"item_id": "ITEM-0003", "platform": "facebook", "section": "profile", "file_path": "facebook/screenshots/facebook_profile_0003_20261112T093403Z.png", "sha256": "a6a9af4e85fa76d00a927cf62b0170d4a5208f61eda9c35aa9494bbfb84fe7fc"}, "prev_hash": "a7318c3f6199135ee71133c38d3c71a8fb3af33ae65f84f4fd862f43c94be764", "event_hash": "3525e7cc649064189f4495e0c5d2f8456f4a3629f699b95fc935f7e2b25b118a"}
{"seq": 10, "timestamp": "2026-11-12T09:34:27.991Z", "actor": "capture_worker", "event_type": "item_captured", "details": {"item_id": "ITEM-0004", "platform": "facebook", "section": "feed", "file_path": "facebook/screenshots/facebook_feed_0004_20261112T093427Z.png", "sha256": "567bc74bd1eb3541522088cd1df4c5b54c9d4c516c2af50ae61742df69b7823b"}, "prev_hash": "3525e7cc649064189f4495e0c5d2f8456f4a3629f699b95fc935f7e2b25b118a", "event_hash": "f9f9c18b7eb1ca494888c63ad600807af14ad62a4c30469b8bd1a7eaf62445c1"}
{"seq": 11, "timestamp": "2026-11-12T09:34:28.440Z", "actor": "capture_worker", "event_type": "capture_finished", "details": {"status": "completed", "items_captured": 4, "errors": 0}, "prev_hash": "f9f9c18b7eb1ca494888c63ad600807af14ad62a4c30469b8bd1a7eaf62445c1", "event_hash": "eb27cd43fcb1d1da2f96330a33bce7e6096f7dc39612331d0e34707e480a499b"}
{"seq": 12, "timestamp": "2026-11-12T09:36:05.221Z", "actor": "desktop_app", "event_type": "integrity_check", "details": {"result": "pass", "items_checked": 4, "issues": []}, "prev_hash": "eb27cd43fcb1d1da2f96330a33bce7e6096f7dc39612331d0e34707e480a499b", "event_hash": "79ae6000b20167f9780e18aa723121e0d15c963f7eaa6291b3a14388afce20c5"}
```

## 8. How evidence integrity is verified

Verification means answering one question: **"Is everything in this case folder exactly as it was when it was captured?"** The desktop app (core library) runs these checks in order and reports every problem it finds, not just the first one.

| #   | Check                                  | How                                                                                                                                                                                                          | If it fails                                                               |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1   | Required files exist                   | `case.json`, `manifest.json`, `hashes.csv` and `audit_log.jsonl` are all present.                                                                                                                            | A metadata file is missing.                                               |
| 2   | Files are valid and agree on the case  | Both JSON files parse; `schema_version` is `"1.0"`; `case_id` is the same in `case.json`, `manifest.json` and the folder name.                                                                               | The case information is damaged or mixed up.                              |
| 3   | Evidence files are unchanged           | For every item in `manifest.json`: the file at `file_path` exists, its size equals `file_size_bytes`, and the SHA-256 calculated now equals `sha256`.                                                        | The file is missing or was changed.                                       |
| 4   | `hashes.csv` agrees with the manifest  | The same items, in the same order, with the same `file_path`, `sha256` and `captured_at`.                                                                                                                    | One of the two lists was edited.                                          |
| 5   | No unlisted files                      | Every file in `<platform>/screenshots/` is in the manifest.                                                                                                                                                  | A file was added, or an item was rejected or never recorded.              |
| 6   | The audit chain is intact              | `seq` runs `1, 2, 3, ...` without gaps; each `prev_hash` equals the previous `event_hash`; every `event_hash` equals the hash calculated again with the rules of section 7.4; timestamps never go backwards. | The log was edited, re-ordered or cut. The first broken line is reported. |
| 7   | The audit log agrees with the manifest | Every manifest item has exactly one `item_captured` event with the same `item_id`, `file_path` and `sha256`, and there are no `item_captured` events without a manifest item.                                | The manifest and the log tell different stories.                          |
| 8   | Names and timestamps follow the rules  | File names match the pattern of section 3.3, and every timestamp matches the format of section 2.1.                                                                                                          | A rule of this contract was broken.                                       |

Result:

- **PASS**: all checks passed. The app adds an `integrity_check` event with `"result": "pass"`.
- **FAIL**: at least one check failed. The app shows the list of problems (check number, item or line, what was expected, what was found) and adds an `integrity_check` event with `"result": "fail"` and the same list in `issues`.

Verification only **reads** evidence files. It never changes them.

What verification cannot prove: someone with full access to the computer could in theory rewrite the manifest, the CSV and the whole audit chain so that they still agree with each other. To protect against that, copy the `event_hash` of the **last audit line** into the written case report (or any place outside the case folder). Anyone can later compare it with the real last line.

## 9. Changing this document

- This document is shared by three people. **Do not change a rule or a field name on your own.** Agree the change with Person 1, Person 2 and Person 3 first.
- When the structure of a file changes, increase `schema_version` and update every example.
- Examples must always follow the rules. If you copy an example into code or tests, check that it still matches the rules above.

### Quick checklist per person

- **Person 1:** file name pattern (3.3), folder `<platform>/screenshots/`, relative paths (2.4), SHA-256 of the saved file, never overwrite a file.
- **Person 2:** same layout, names, platform IDs and timestamp format for every case folder the Android app creates; `device.type` is `"android"`; `actor` is `android_app` for events caused by the Android app.
- **Person 3:** write the four metadata files (sections 4 to 7), calculate the hash chain exactly as in 7.4, run the integrity check of section 8, never edit an existing line or item.
