/**
 * Unit tests for P3-06: Hash-chained append-only audit log.
 *
 * Requirements:
 * - Each audit_log.jsonl line stores the hash of the previous line.
 * - Provide appendAudit().
 * - Test: modifying a line breaks the chain.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  NodeFileSystem,
  nodeSha256,
  createCaseFolder,
  appendAudit,
  readAuditLog,
  verifyAuditChain,
  ZERO_HASH,
} from '../src/index.ts';
import type { CreateCaseInput } from '../src/index.ts';

// ---------------------------------------------------------------------------
// Temp directory setup
// ---------------------------------------------------------------------------

let tmpRoot: string;

before(async () => {
  tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'smp-p3-06-'));
});

after(async () => {
  await fsp.rm(tmpRoot, { recursive: true, force: true });
});

async function makeTempDir(label: string): Promise<string> {
  const dir = path.join(tmpRoot, label + '-' + Date.now());
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

const BASE_CASE_INPUT: CreateCaseInput = {
  case_id: 'CASE-2026-0042',
  case_number: 'CCU/FIR/118/2026',
  examiner_name: 'Priya Deshmukh',
  examiner_designation: 'Sub-Inspector',
  accused_name: 'Sample Accused',
  agency: 'Example Cyber Crime Unit',
  device: {
    type: 'desktop',
    name: 'EXAMINER-MAC-01',
    os: 'macOS',
    os_version: '14.5',
    app_version: '0.1.0',
  },
  remarks: 'Test case for audit log',
  created_at: '2026-11-12T09:15:02.118Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('appendAudit and hash chaining', () => {
  it('appends multiple events correctly with continuous sequence and hash links', async () => {
    const testDir = await makeTempDir('audit-chain-ok');
    const fs = new NodeFileSystem();

    // 1. Case creation writes line 1: case_created
    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    const initialEvents = await readAuditLog(caseFolderPath, fs);
    assert.equal(initialEvents.length, 1);
    assert.equal(initialEvents[0].seq, 1);
    assert.equal(initialEvents[0].event_type, 'case_created');
    assert.equal(initialEvents[0].prev_hash, ZERO_HASH);

    // 2. Append event 2: capture_started
    const event2 = await appendAudit(
      caseFolderPath,
      {
        actor: 'examiner',
        event_type: 'capture_started',
        details: { platforms: ['instagram', 'facebook'], sections: ['profile', 'feed'] },
        timestamp: '2026-11-12T09:30:10.004Z',
      },
      fs,
      nodeSha256,
    );

    assert.equal(event2.seq, 2);
    assert.equal(event2.prev_hash, initialEvents[0].event_hash);

    // 3. Append event 3: user_action_required
    const event3 = await appendAudit(
      caseFolderPath,
      {
        actor: 'capture_worker',
        event_type: 'user_action_required',
        details: { platform: 'instagram', section: null, reason: 'login' },
        timestamp: '2026-11-12T09:30:12.530Z',
      },
      fs,
      nodeSha256,
    );

    assert.equal(event3.seq, 3);
    assert.equal(event3.prev_hash, event2.event_hash);

    // 4. Append event 4: capture_resumed
    const event4 = await appendAudit(
      caseFolderPath,
      {
        actor: 'capture_worker',
        event_type: 'capture_resumed',
        details: { platform: 'instagram', section: 'profile' },
        timestamp: '2026-11-12T09:31:44.907Z',
      },
      fs,
      nodeSha256,
    );

    assert.equal(event4.seq, 4);
    assert.equal(event4.prev_hash, event3.event_hash);

    // 5. Read back all events and verify chain
    const allEvents = await readAuditLog(caseFolderPath, fs);
    assert.equal(allEvents.length, 4);

    const verification = await verifyAuditChain(allEvents, nodeSha256);
    assert.equal(verification.valid, true);
    assert.equal(verification.issues.length, 0);
  });

  it('detects tampering when an audit line detail is modified', async () => {
    const testDir = await makeTempDir('audit-tamper-detail');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    await appendAudit(
      caseFolderPath,
      {
        actor: 'examiner',
        event_type: 'capture_started',
        details: { platforms: ['instagram'], sections: ['profile'] },
        timestamp: '2026-11-12T09:30:10.004Z',
      },
      fs,
      nodeSha256,
    );

    await appendAudit(
      caseFolderPath,
      {
        actor: 'capture_worker',
        event_type: 'item_captured',
        details: {
          item_id: 'ITEM-0001',
          platform: 'instagram',
          section: 'profile',
          file_path: 'instagram/screenshots/test.png',
          sha256: '7bd79a21490bd2d340b14106f61950781c1788f950b0763b68bacca91d18eceb',
        },
        timestamp: '2026-11-12T09:31:58.352Z',
      },
      fs,
      nodeSha256,
    );

    // Read raw file content
    const logPath = path.join(caseFolderPath, 'audit_log.jsonl');
    const rawContent = await fs.read(logPath);
    const lines = rawContent.trim().split('\n');

    // Tamper with line 2: change platform in details without updating hashes
    const line2Obj = JSON.parse(lines[1]);
    line2Obj.details.platforms = ['instagram', 'malicious_platform'];
    lines[1] = JSON.stringify(line2Obj);

    // Write back tampered log
    await fs.write(logPath, lines.join('\n') + '\n');

    // Verify verification fails
    const tamperedEvents = await readAuditLog(caseFolderPath, fs);
    const verification = await verifyAuditChain(tamperedEvents, nodeSha256);

    assert.equal(verification.valid, false);
    assert.equal(verification.brokenAtSeq, 2);
    assert.ok(
      verification.issues.some((iss) => iss.includes('Event hash tampering detected at line 2')),
      `Expected tampering error for line 2, got: ${verification.issues.join('; ')}`,
    );
  });

  it('detects tampering when an intermediate line is deleted', async () => {
    const testDir = await makeTempDir('audit-tamper-delete');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    await appendAudit(
      caseFolderPath,
      {
        actor: 'examiner',
        event_type: 'capture_started',
        details: { platforms: ['instagram'], sections: ['profile'] },
        timestamp: '2026-11-12T09:30:10.004Z',
      },
      fs,
      nodeSha256,
    );

    await appendAudit(
      caseFolderPath,
      {
        actor: 'capture_worker',
        event_type: 'capture_finished',
        details: { status: 'completed', items_captured: 1, errors: 0 },
        timestamp: '2026-11-12T09:34:28.440Z',
      },
      fs,
      nodeSha256,
    );

    // Delete line 2
    const logPath = path.join(caseFolderPath, 'audit_log.jsonl');
    const rawContent = await fs.read(logPath);
    const lines = rawContent.trim().split('\n');
    lines.splice(1, 1); // delete line 2

    await fs.write(logPath, lines.join('\n') + '\n');

    const remainingEvents = await readAuditLog(caseFolderPath, fs);
    const verification = await verifyAuditChain(remainingEvents, nodeSha256);

    assert.equal(verification.valid, false);
    assert.ok(
      verification.issues.some((iss) => iss.includes('Sequence gap') || iss.includes('Hash chain break')),
    );
  });

  it('detects tampering when timestamps go backwards', async () => {
    const testDir = await makeTempDir('audit-tamper-timestamp');
    const fs = new NodeFileSystem();

    const { caseFolderPath } = await createCaseFolder(
      testDir,
      BASE_CASE_INPUT,
      fs,
      nodeSha256,
    );

    await appendAudit(
      caseFolderPath,
      {
        actor: 'examiner',
        event_type: 'capture_started',
        details: { platforms: ['instagram'], sections: ['profile'] },
        timestamp: '2026-11-12T09:30:10.004Z',
      },
      fs,
      nodeSha256,
    );

    // Read back and verify timestamp going backwards check
    const events = await readAuditLog(caseFolderPath, fs);
    // Artificially change line 2 timestamp to earlier than line 1 and rehash it legitimately
    const line2 = events[1];
    line2.timestamp = '2026-11-12T09:00:00.000Z'; // earlier than line 1's 09:15:02
    const { hashAuditEvent } = await import('../src/index.ts');
    const hashed = await hashAuditEvent(
      {
        seq: line2.seq,
        timestamp: line2.timestamp,
        actor: line2.actor,
        event_type: line2.event_type,
        details: line2.details,
        prev_hash: line2.prev_hash,
      },
      nodeSha256,
    );
    line2.event_hash = hashed.event_hash;

    const verification = await verifyAuditChain(events, nodeSha256);
    assert.equal(verification.valid, false);
    assert.ok(
      verification.issues.some((iss) => iss.includes('Timestamp went backwards')),
    );
  });
});
