# SocialParse Worker Protocol

|                        |                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Spec version**       | 1.0                                                                                                               |
| **Task**               | P3-02                                                                                                             |
| **Owner**              | Person 3 (core library and desktop app)                                                                           |
| **Used by**            | Person 1 (capture worker, implements the **server** side), Person 3 (desktop app, implements the **client** side) |
| **Companion document** | [DATA_CONTRACT.md](DATA_CONTRACT.md)                                                                              |

Person 2's Android app does not use this protocol. It is written for the desktop app and the capture worker.

## 1. What this document is for

The **desktop app** (what the examiner sees) and the **capture worker** (a Node.js + Playwright program that controls a browser and takes the screenshots) are two separate programs. This document defines the messages they send to each other over a **WebSocket**, so that both sides understand each other without guessing.

All timestamps, hashes, paths, IDs and field names follow section 2 of [DATA_CONTRACT.md](DATA_CONTRACT.md). The names in the messages are the same names as in the data files (`case_id`, `platform`, `section`, `file_path`, `sha256`, `captured_at`).

### 1.1 Who does what

|                                                               | Capture worker (Person 1)                      | Desktop app (Person 3)                                           |
| ------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| Role in the connection                                        | WebSocket **server**                           | WebSocket **client**                                             |
| Browser                                                       | Opens and controls it                          | Never touches it                                                 |
| Screenshot files                                              | Takes them, saves them, calculates the SHA-256 | Verifies them (checks the file and calculates the SHA-256 again) |
| `case.json`, `manifest.json`, `hashes.csv`, `audit_log.jsonl` | **Never writes them**                          | Writes all four                                                  |
| Screen shown to the examiner                                  | None (except the browser window itself)        | Progress, messages, errors                                       |

The worker only **reports** what it did. The desktop app is the one that records it as evidence.

## 2. Messages at a glance

| Message      | Sent by     | Received by | Meaning                                                     |
| ------------ | ----------- | ----------- | ----------------------------------------------------------- |
| `start`      | Desktop app | Worker      | "Begin capturing this case."                                |
| `progress`   | Worker      | Desktop app | "This is how far I am."                                     |
| `item`       | Worker      | Desktop app | "I saved a new screenshot."                                 |
| `needs_user` | Worker      | Desktop app | "I am paused: the person must do something in the browser." |
| `error`      | Worker      | Desktop app | "Something went wrong."                                     |
| `done`       | Worker      | Desktop app | "The session is finished."                                  |

Only `start` goes from the desktop app to the worker. Everything else goes from the worker to the desktop app.

## 3. Connection

### 3.1 Address

| Setting | Value                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------- |
| URL     | `ws://127.0.0.1:8765`                                                                                             |
| Host    | `127.0.0.1` (the computer itself, "localhost")                                                                    |
| Port    | `8765` (default). Keep it in **one shared constant** in `packages/core` so both sides always use the same number. |

- The worker must listen on `127.0.0.1` **only**, never on `0.0.0.0`. That way no other computer on the network can reach it.
- This specification does not add a password or token. Other programs on the same computer could connect.
- Messages are plain WebSocket **text frames** containing **one JSON object each**, encoded as UTF-8. No binary frames, no extra WebSocket sub-protocol.
- Screenshots are **never** sent through the WebSocket. The worker saves them on disk and only sends the path and hash.

### 3.2 Message format

Every message has the same outer shape:

```text
{
  "type": "<message name>",
  "payload": { ...fields of that message... }
}
```

- `type` is one of `start`, `progress`, `item`, `needs_user`, `error`, `done`.
- `payload` is an object holding the fields described in section 4.
- Required fields are never left out; "no value" is `null` (see DATA_CONTRACT section 2.6).
- Unknown extra fields must be **ignored**, not treated as an error.
- A message with invalid JSON, an unknown `type` or a missing required field is answered with an `error` message with code `INVALID_MESSAGE` (see section 7).

### 3.3 Connection lifecycle

```text
Desktop app (client)                            Capture worker (server)
        |                                                |
        |  1. connect to ws://127.0.0.1:8765             |
        |----------------------------------------------->|
        |  2. start                                      |
        |----------------------------------------------->|
        |                  3. needs_user  (if login etc.)|
        |<-----------------------------------------------|
        |     (person acts in the browser window)        |
        |                  4. progress   (running)       |
        |<-----------------------------------------------|
        |                  5. item       (per screenshot)|
        |<-----------------------------------------------|
        |                  6. progress   (completed)     |
        |<-----------------------------------------------|
        |             ... steps 3 to 6 repeat ...        |
        |                  7. done                       |
        |<-----------------------------------------------|
        |                  8. worker closes (code 1000)  |
        |<-----------------------------------------------|
```

1. **Before connecting.** The worker is running and listening. How it is started is not part of this document. If the desktop app cannot connect, it tells the examiner that the capture worker is not running.
2. **One session per connection.** One connection carries exactly one capture session, from `start` to `done`.
3. **Only one session at a time.** If a second `start` arrives while a session is running, the worker answers with `error` `SESSION_ALREADY_RUNNING` and keeps the first session running.
4. **Normal end.** After sending `done`, the worker closes the connection with the normal WebSocket close code `1000`. The desktop app treats a close **after** `done` as normal.
5. **Desktop app disconnects during a session.** The worker stops capturing, closes the browser and keeps the files it already saved. It writes nothing else.
6. **Worker disconnects or crashes during a session** (the connection closes **without** `done`). The desktop app marks the session as failed, shows an error, and records a `capture_error` event with the code `WORKER_DISCONNECTED` in the audit log.
7. **No resume across connections.** If the connection is lost, the session is over. The examiner starts a new session; items that were already recorded stay in the case.

## 4. The messages

### 4.1 `start`

**Purpose:** Starts a capture session.

**Direction:** Desktop app **sends**, worker **receives**.

**Fields of `payload`:**

| Field              | Type             | Description                                                                                                                                                                                                                               |
| ------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `case_id`          | string           | The case being captured (`CASE-YYYY-NNNN`).                                                                                                                                                                                               |
| `case_folder`      | string           | **Absolute** path of the case folder on this computer. The worker saves screenshots below it. This is the only absolute path in the project.                                                                                              |
| `next_item_number` | integer          | The number to use for the first screenshot of this session. It is one more than the highest item number that appears in `manifest.json` or in any screenshot file name of the case (`1` for a new case). The worker counts up from there. |
| `platforms`        | array of strings | Platform IDs to capture, in this order (for example `["instagram", "facebook"]`).                                                                                                                                                         |
| `config`           | object           | Settings for this session (table below).                                                                                                                                                                                                  |

Fields of `config`:

| Field                         | Type             | Description                                                                                |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| `sections`                    | array of strings | Section IDs to capture on **every** selected platform (for example `["profile", "feed"]`). |
| `max_items_per_section`       | integer          | The most screenshots the worker may take in one section.                                   |
| `user_action_timeout_seconds` | integer          | How long the worker waits for the person after a `needs_user` message before giving up.    |

**Example:**

```json
{
  "type": "start",
  "payload": {
    "case_id": "CASE-2026-0042",
    "case_folder": "/Users/examiner/SocialParse/cases/CASE-2026-0042",
    "next_item_number": 1,
    "platforms": ["instagram", "facebook"],
    "config": {
      "sections": ["profile", "feed"],
      "max_items_per_section": 20,
      "user_action_timeout_seconds": 300
    }
  }
}
```

**Expected behaviour:**

- _Desktop app, before sending:_ the case folder and the four metadata files already exist (DATA_CONTRACT section 3.2); the audit log gets a `capture_started` event; the app shows "Capture started".
- _Worker, on receiving:_ checks the message. If something is wrong (missing field, unknown platform or section ID), it sends `error` `INVALID_START_REQUEST` (fatal). If the case folder does not exist or cannot be written to, it sends `error` `CASE_FOLDER_ERROR` (fatal). Otherwise it opens a **visible** browser window and starts with the first platform.
- _Worker:_ creates `<platform>/screenshots/` inside `case_folder` when it first needs it.

### 4.2 `progress`

**Purpose:** Reports how far the capture has come.

**Direction:** Worker **sends**, desktop app **receives**.

**Fields of `payload`:**

| Field      | Type    | Description                                                                                                                                  |
| ---------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform` | string  | Platform ID the worker is working on.                                                                                                        |
| `section`  | string  | Section ID the worker is working on.                                                                                                         |
| `percent`  | integer | **Overall** progress of the whole session, from `0` to `100` (rules in section 5).                                                           |
| `status`   | string  | `"running"` (the worker started or continued working on this platform and section) or `"completed"` (this platform and section is finished). |

**Example:**

```json
{
  "type": "progress",
  "payload": {
    "platform": "instagram",
    "section": "profile",
    "percent": 25,
    "status": "completed"
  }
}
```

Another example, sent when the worker starts the next section:

```json
{
  "type": "progress",
  "payload": {
    "platform": "instagram",
    "section": "feed",
    "percent": 25,
    "status": "running"
  }
}
```

**Expected behaviour:**

- _Desktop app:_ updates the progress bar to `percent` and shows a label such as "instagram: feed". A `progress` with status `running` that arrives after a `needs_user` also means "the worker is working again", so the app closes its waiting message (section 6). No audit event is written for normal progress, except the `capture_resumed` event in that case.
- _Worker:_ sends `running` when it begins a platform and section, and `completed` when it has finished it.

### 4.3 `item`

**Purpose:** Reports one newly captured evidence item (one saved screenshot).

**Direction:** Worker **sends**, desktop app **receives**.

**Fields of `payload`:** exactly the fields of one manifest item (DATA_CONTRACT section 5.3).

| Field             | Type    | Description                                                         |
| ----------------- | ------- | ------------------------------------------------------------------- |
| `item_id`         | string  | `ITEM-NNNN`. The worker continues counting from `next_item_number`. |
| `platform`        | string  | Platform ID.                                                        |
| `section`         | string  | Section ID.                                                         |
| `file_path`       | string  | Path of the screenshot **relative to `case_folder`**, using `/`.    |
| `file_size_bytes` | integer | Size of the file in bytes.                                          |
| `sha256`          | string  | SHA-256 of the saved file (64 lowercase hex characters).            |
| `captured_at`     | string  | When the screenshot was taken (ISO 8601 UTC).                       |

**Example:**

```json
{
  "type": "item",
  "payload": {
    "item_id": "ITEM-0001",
    "platform": "instagram",
    "section": "profile",
    "file_path": "instagram/screenshots/instagram_profile_0001_20261112T093158Z.png",
    "file_size_bytes": 482113,
    "sha256": "db6e4f3ea63c2586faa75a9de1380911542718cb398d66473ba66e7fa78c0376",
    "captured_at": "2026-11-12T09:31:58.311Z"
  }
}
```

**Expected behaviour:**

- _Worker:_ first **saves the file completely**, names it as in DATA_CONTRACT section 3.3, calculates the SHA-256 and the size of the saved file, and only then sends `item`. It never sends `item` for a file that is not fully written.
- _Desktop app, on receiving:_ checks the item before accepting it:
  1. `file_path` is relative, has no `..`, and the file really is inside the case folder.
  2. The file name follows the naming pattern and matches `item_id`, `platform`, `section` and `captured_at`.
  3. The file exists, and the SHA-256 and size calculated by the app **match** the values in the message. The app never trusts the worker's hash without checking it.
- _Desktop app, if all checks pass:_ adds the item to `manifest.json`, adds a row to `hashes.csv`, and **last** appends an `item_captured` event to `audit_log.jsonl` (writing the audit line last means every `item_captured` line always has a manifest entry). Then it shows the new screenshot.
- _Desktop app, if a check fails:_ the item is **not** added to the manifest. It appends an `item_rejected` event with the reason and shows a warning. The session goes on. The file stays on disk, and the integrity check will show it as an unlisted file.

### 4.4 `needs_user`

**Purpose:** Tells the desktop app that the capture is **paused** because the person must do something manually in the browser window: log in, enter a one-time password, complete two-factor authentication or solve a CAPTCHA.

**Direction:** Worker **sends**, desktop app **receives**.

**Fields of `payload`:**

| Field             | Type             | Description                                                                                        |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `platform`        | string           | Platform ID the action is needed for.                                                              |
| `section`         | string or `null` | Section ID, or `null` when the action is needed for the platform as a whole (normal for a login).  |
| `reason`          | string           | `"login"`, `"otp"` (one-time password), `"two_factor"` (two-factor authentication) or `"captcha"`. |
| `message`         | string           | A short text to show to the person.                                                                |
| `timeout_seconds` | integer          | How long the worker will wait. Same value as `user_action_timeout_seconds` in `start`.             |

**Example:**

```json
{
  "type": "needs_user",
  "payload": {
    "platform": "instagram",
    "section": null,
    "reason": "login",
    "message": "Please log in to Instagram in the browser window that just opened.",
    "timeout_seconds": 300
  }
}
```

**Expected behaviour:**

- _Worker:_ stops capturing, leaves the browser window open and **in front**, and waits. It watches the page itself and notices when the action is finished (for example the login page is gone). See section 6.
- _Desktop app:_ shows a clear, hard-to-miss message with `message` and a countdown from `timeout_seconds`, and tells the person to act **in the browser window that the worker opened**. It adds a `user_action_required` event to the audit log. The app does **not** send anything back to the worker.
- The person must not close the browser window.

### 4.5 `error`

**Purpose:** Reports a problem during the capture.

**Direction:** Worker **sends**, desktop app **receives**.

**Fields of `payload`:**

| Field      | Type             | Description                                                                                                                                  |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`     | string           | Error code from the table in section 7.                                                                                                      |
| `message`  | string           | A readable explanation that can be shown to the examiner.                                                                                    |
| `platform` | string or `null` | Platform ID the error belongs to, or `null` if it is not about one platform.                                                                 |
| `section`  | string or `null` | Section ID the error belongs to, or `null`.                                                                                                  |
| `fatal`    | boolean          | `true`: the whole session stops (a `done` with status `"failed"` follows). `false`: the worker carries on with the next section or platform. |

**Example** (this example is **not** part of the sample session in section 9; in that session nothing goes wrong):

```json
{
  "type": "error",
  "payload": {
    "code": "USER_ACTION_TIMEOUT",
    "message": "Login to Facebook was not completed within 300 seconds. Facebook was skipped.",
    "platform": "facebook",
    "section": null,
    "fatal": false
  }
}
```

**Expected behaviour:**

- _Desktop app:_ shows the `message`, adds a `capture_error` event to the audit log, and counts the error. If `fatal` is `true` it waits for the `done` message.
- _Worker:_ if `fatal` is `false`, it skips whatever failed (the section or the platform), continues, and the final status will be `"completed_with_errors"`.

### 4.6 `done`

**Purpose:** Tells the desktop app that the capture session has finished, with the final status and a summary.

**Direction:** Worker **sends**, desktop app **receives**.

**Fields of `payload`:**

| Field         | Type   | Description                                                                                                                                            |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `status`      | string | `"completed"` (no errors), `"completed_with_errors"` (finished, but at least one non-fatal `error` was sent) or `"failed"` (stopped by a fatal error). |
| `started_at`  | string | When the worker started the session (ISO 8601 UTC).                                                                                                    |
| `finished_at` | string | When the worker finished the session (ISO 8601 UTC).                                                                                                   |
| `summary`     | object | Totals (table below).                                                                                                                                  |

Fields of `summary`:

| Field            | Type    | Description                                                                                                                                                                                                      |
| ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items_captured` | integer | Number of `item` messages the worker sent in this session.                                                                                                                                                       |
| `errors`         | integer | Number of `error` messages the worker sent in this session.                                                                                                                                                      |
| `platforms`      | array   | One entry per requested platform: `platform` (Platform ID), `status` (`"completed"`, `"completed_with_errors"` or `"failed"`, using the same meaning as above for that platform) and `items_captured` (integer). |

**Example:**

```json
{
  "type": "done",
  "payload": {
    "status": "completed",
    "started_at": "2026-11-12T09:30:10.020Z",
    "finished_at": "2026-11-12T09:34:28.402Z",
    "summary": {
      "items_captured": 4,
      "errors": 0,
      "platforms": [
        {
          "platform": "instagram",
          "status": "completed",
          "items_captured": 2
        },
        {
          "platform": "facebook",
          "status": "completed",
          "items_captured": 2
        }
      ]
    }
  }
}
```

**Expected behaviour:**

- _Worker:_ sends `done` **last**, after the final `progress` and `item` messages, closes the browser, and then closes the connection (code `1000`). It sends `done` after a fatal error too.
- _Desktop app:_ appends a `capture_finished` event to the audit log, compares `items_captured` with the number of items it accepted (a difference is reported to the examiner), runs the integrity check of DATA_CONTRACT section 8, and shows the final result.

## 5. How progress is communicated

- `percent` is the **overall** progress of the whole session, so the desktop app can drive a single progress bar.
- One **step** is one platform and one section. The session has `total_steps = number of platforms × number of sections` steps. The sample session has 2 platforms and 2 sections, so 4 steps of 25 % each.
- `percent` = `round(100 × completed_steps ÷ total_steps)`.
- When the worker **starts** a step it sends `running` with the percent of the steps already completed. When it **finishes** a step it sends `completed` with the new percent.
- A step that is skipped because of a non-fatal error counts as completed, so the bar still reaches `100`.
- `percent` never goes down. The last `progress` of a session that ran to the end has `100`; `done` is sent after it.
- After a fatal error `percent` stays where it was.

## 6. Manual login: pause and resume

The examiner logs in **by hand**, directly in the browser window opened by the worker. The desktop app never sees the password or the code.

```text
Worker                                              Desktop app
  |  opens platform, sees it is not logged in             |
  |  needs_user (reason "login", timeout 300 s)           |
  |------------------------------------------------------>|  shows message and countdown,
  |  waits, browser window stays open                     |  audit: user_action_required
  |                                                       |
  |       person logs in inside the browser window        |
  |                                                       |
  |  worker notices the login is complete                 |
  |  progress (status "running")                          |
  |------------------------------------------------------>|  closes message,
  |  continues capturing                                  |  audit: capture_resumed
```

1. **Pause.** The worker opens the platform and checks whether the account is logged in. If not (or if it meets an OTP, two-factor or CAPTCHA page), it sends `needs_user` and stops capturing. It sends **no** further `item` messages while it is paused.
2. **Waiting.** The browser window stays open. The desktop app shows the message. Both sides use the same `timeout_seconds`.
3. **Resume.** The worker watches the page itself. As soon as the action is finished, the worker continues by itself and sends a `progress` message with status `running`. That message is the signal "I am working again". There is **no** separate "continue" message from the desktop app.
4. **Several actions in a row.** A login can be followed by an OTP or a CAPTCHA. The worker then sends a new `needs_user` for each one (with the matching `reason`), and resumes the same way.
5. **Timeout.** If the action is not finished within `timeout_seconds`, the worker sends `error` `USER_ACTION_TIMEOUT` (not fatal), skips that platform and goes on with the next one.
6. **What the examiner sees.** While paused, the desktop app shows the platform, the reason and the countdown. It does not show a "Continue" button, because the worker notices the login itself.

## 7. Error handling

### 7.1 Error codes

| Code                      | `fatal`           | When it is sent                                                                                                               | Result                                                     |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `INVALID_MESSAGE`         | `false`           | The worker received invalid JSON, an unknown `type`, or a message with missing fields (other than `start`).                   | The message is ignored.                                    |
| `INVALID_START_REQUEST`   | `true`            | The `start` message is incomplete or wrong (for example an unknown platform ID).                                              | Nothing is captured. `done` with `"failed"` follows.       |
| `SESSION_ALREADY_RUNNING` | `false`           | A `start` arrives while a session is running.                                                                                 | The new `start` is ignored; the running session continues. |
| `CASE_FOLDER_ERROR`       | `true`            | `case_folder` does not exist or cannot be written to.                                                                         | Nothing is captured. `done` with `"failed"` follows.       |
| `BROWSER_LAUNCH_FAILED`   | `true`            | The browser could not be started.                                                                                             | `done` with `"failed"` follows.                            |
| `USER_ACTION_TIMEOUT`     | `false`           | The person did not finish a `needs_user` action in time.                                                                      | The platform is skipped.                                   |
| `PAGE_LOAD_TIMEOUT`       | `false`           | A page did not load in time.                                                                                                  | The section is skipped.                                    |
| `SCREENSHOT_FAILED`       | `false`           | A screenshot could not be taken or saved.                                                                                     | The section is skipped.                                    |
| `UNEXPECTED_ERROR`        | `true` or `false` | Anything else. The worker decides and sets `fatal` honestly.                                                                  | As given by `fatal`.                                       |
| `WORKER_DISCONNECTED`     | `true`            | **Never sent over the WebSocket.** Created by the desktop app itself when the connection closes without `done` (section 3.3). | The session is marked failed.                              |

Error codes are written in capital letters with underscores. A new code is added to this table first, and only then used in code.

### 7.2 Rules

1. **Never stay silent.** The worker must report every problem with an `error` message, and the desktop app must show it.
2. **Non-fatal errors** skip the part that failed and the session continues. The final status of the session becomes `completed_with_errors`.
3. **Fatal errors** end the session. The worker sends `error` with `fatal: true`, stops, closes the browser, and sends `done` with status `"failed"`. Files that were already saved stay where they are.
4. **Evidence is never deleted** because of an error. Items already accepted stay in the manifest.
5. **Desktop app:** every `error` becomes a `capture_error` event in the audit log, so errors are part of the history of the case.
6. **Hash or file problems** found by the desktop app are not worker errors. They become `item_rejected` events (section 4.3).

## 8. How the worker communicates completion

1. The worker finishes the last platform and section. It sends the last `progress` (`completed`, `percent` `100`) and all remaining `item` messages.
2. It closes the browser.
3. It sends **one** `done` message. Its `status` tells whether everything worked (`completed`), some parts failed (`completed_with_errors`) or the session was stopped (`failed`); its `summary` gives the totals.
4. It closes the WebSocket connection with code `1000`.

`done` is always the **last** message of a session, even after a fatal error. If the connection closes without a `done`, the desktop app knows the worker did not finish normally (section 3.3, point 6).

The desktop app then records `capture_finished`, runs the integrity check, and shows the examiner the result.

## 9. Sample session

This is the complete sample session for `CASE-2026-0042`. The same session produced the manifest, `hashes.csv` and audit log shown in [DATA_CONTRACT.md](DATA_CONTRACT.md) (sections 5 to 7). The session has 2 platforms and 2 sections, so 4 steps of 25 %.

| #   | Direction            | Message         | What it says                                                                                                |
| --- | -------------------- | --------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Desktop app → Worker | `start`         | Capture `instagram` and `facebook`, sections `profile` and `feed`, starting at item number 1 (section 4.1). |
| 2   | Worker → Desktop app | `needs_user`    | `instagram`, reason `login` (section 4.4).                                                                  |
| 3   | Worker → Desktop app | `progress`      | `instagram`, `profile`, `0`, `running` (the login is done).                                                 |
| 4   | Worker → Desktop app | `item`          | `ITEM-0001` (section 4.3).                                                                                  |
| 5   | Worker → Desktop app | `progress`      | `instagram`, `profile`, `25`, `completed` (section 4.2).                                                    |
| 6   | Worker → Desktop app | `progress`      | `instagram`, `feed`, `25`, `running`.                                                                       |
| 7   | Worker → Desktop app | `item`          | `ITEM-0002`.                                                                                                |
| 8   | Worker → Desktop app | `progress`      | `instagram`, `feed`, `50`, `completed`.                                                                     |
| 9   | Worker → Desktop app | `needs_user`    | `facebook`, reason `login`.                                                                                 |
| 10  | Worker → Desktop app | `progress`      | `facebook`, `profile`, `50`, `running`.                                                                     |
| 11  | Worker → Desktop app | `item`          | `ITEM-0003`.                                                                                                |
| 12  | Worker → Desktop app | `progress`      | `facebook`, `profile`, `75`, `completed`.                                                                   |
| 13  | Worker → Desktop app | `progress`      | `facebook`, `feed`, `75`, `running`.                                                                        |
| 14  | Worker → Desktop app | `item`          | `ITEM-0004`.                                                                                                |
| 15  | Worker → Desktop app | `progress`      | `facebook`, `feed`, `100`, `completed`.                                                                     |
| 16  | Worker → Desktop app | `done`          | Status `completed`, 4 items, 0 errors (section 4.6).                                                        |
| 17  | Worker → Desktop app | WebSocket close | Code `1000`.                                                                                                |

## 10. How messages map to the data files

This table shows where each value from a message ends up. The names are the same everywhere, so nothing needs to be translated.

| Message field                                                     | `manifest.json`                       | `hashes.csv`          | `audit_log.jsonl`                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `start` → `case_id`                                               | `case_id`                             | (the case folder)     | (the case folder)                                                                                           |
| `start` → `platforms`, `config.sections`                          |                                       |                       | `capture_started` → `details.platforms`, `details.sections`                                                 |
| `item` → `item_id`                                                | `items[].item_id`                     | `item_id`             | `item_captured` → `details.item_id`                                                                         |
| `item` → `platform`, `section`                                    | `items[].platform`, `items[].section` | `platform`, `section` | `item_captured` → `details.platform`, `details.section`                                                     |
| `item` → `file_path`                                              | `items[].file_path`                   | `file_path`           | `item_captured` → `details.file_path`                                                                       |
| `item` → `file_size_bytes`                                        | `items[].file_size_bytes`             |                       |                                                                                                             |
| `item` → `sha256`                                                 | `items[].sha256`                      | `sha256`              | `item_captured` → `details.sha256`                                                                          |
| `item` → `captured_at`                                            | `items[].captured_at`                 | `captured_at`         |                                                                                                             |
| `needs_user` → `platform`, `section`, `reason`                    |                                       |                       | `user_action_required` → `details.platform`, `details.section`, `details.reason`                            |
| `progress` (`running` after `needs_user`) → `platform`, `section` |                                       |                       | `capture_resumed` → `details.platform`, `details.section`                                                   |
| `error` → `code`, `message`, `platform`, `section`, `fatal`       |                                       |                       | `capture_error` → `details.code`, `details.message`, `details.platform`, `details.section`, `details.fatal` |
| `done` → `status`, `summary.items_captured`, `summary.errors`     |                                       |                       | `capture_finished` → `details.status`, `details.items_captured`, `details.errors`                           |

## 11. Changing this document

- This protocol is shared by Person 1 and Person 3, and its data follows the data contract that Person 2 also uses. **Do not change a message, a field or an error code on your own.** Agree the change first, then update this document, then the code.
- Do not add new message types or fields that are not described here.
- If the data format changes, change [DATA_CONTRACT.md](DATA_CONTRACT.md) first so both documents keep using the same names.

### Quick checklist per person

- **Person 1 (worker):** listen on `127.0.0.1:8765` only; one session per connection; save the file completely, then send `item`; never write the four metadata files; pause with `needs_user` and resume by sending `progress` `running`; always end with `done` and close with code `1000`.
- **Person 3 (desktop app):** connect, send `start` with an absolute `case_folder` and a correct `next_item_number`; verify every `item` yourself before recording it; write the manifest, CSV and audit log (manifest and CSV first, audit line last); show `needs_user` messages clearly; record every `error`; run the integrity check after `done`.
