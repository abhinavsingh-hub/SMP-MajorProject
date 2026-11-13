import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MockCaptureWorkerClient,
  type WorkerMessage,
} from '../src/services/capture-client.ts';

describe('Capture Worker Protocol Client & Screen (P3-12)', () => {
  test('manages connection lifecycle', async () => {
    const client = new MockCaptureWorkerClient();
    assert.equal(client.isConnected(), false);

    await client.connect();
    assert.equal(client.isConnected(), true);

    client.disconnect();
    assert.equal(client.isConnected(), false);
  });

  test('throws error if startCapture called before connect', async () => {
    const client = new MockCaptureWorkerClient();
    await assert.rejects(
      async () => {
        await client.startCapture({
          case_id: 'CASE-2026-0001',
          case_folder: '/tmp/test',
          next_item_number: 1,
          platforms: ['instagram'],
          config: {
            sections: ['profile'],
            max_items_per_section: 5,
            user_action_timeout_seconds: 60,
          },
        });
      },
      { message: /not connected/ },
    );
  });

  test('simulates protocol message stream (needs_user, progress, item, done)', async () => {
    const client = new MockCaptureWorkerClient();
    client.speedMultiplier = 100; // Fast execution for unit tests
    await client.connect();

    const receivedMessages: WorkerMessage[] = [];
    const unsubscribe = client.onMessage((msg) => {
      receivedMessages.push(msg);
    });

    await client.startCapture({
      case_id: 'CASE-2026-0001',
      case_folder: '/tmp/cases/CASE-2026-0001',
      next_item_number: 1,
      platforms: ['facebook', 'instagram'],
      config: {
        sections: ['profile', 'feed'],
        max_items_per_section: 10,
        user_action_timeout_seconds: 300,
      },
    });

    // Wait for the simulated async timer stream to complete
    await new Promise((resolve) => setTimeout(resolve, 150));

    unsubscribe();
    client.disconnect();

    const types = receivedMessages.map((m) => m.type);

    // Verify all protocol message types were emitted
    assert.ok(types.includes('needs_user'), 'Expected needs_user message');
    assert.ok(types.includes('progress'), 'Expected progress message');
    assert.ok(types.includes('item'), 'Expected item message');
    assert.ok(types.includes('done'), 'Expected done message');

    // Check item structure conforms to DATA_CONTRACT §5
    const itemMsgs = receivedMessages.filter((m) => m.type === 'item');
    assert.equal(itemMsgs.length, 4); // 2 items per platform * 2 platforms
    const firstItem = itemMsgs[0];
    if (firstItem.type === 'item') {
      assert.equal(firstItem.payload.item_id, 'ITEM-0001');
      assert.equal(firstItem.payload.platform, 'facebook');
      assert.ok(firstItem.payload.file_path.startsWith('facebook/screenshots/'));
      assert.equal(firstItem.payload.sha256.length, 64);
    }

    // Check done message summary
    const doneMsg = receivedMessages.find((m) => m.type === 'done');
    assert.ok(doneMsg);
    if (doneMsg && doneMsg.type === 'done') {
      assert.equal(doneMsg.payload.status, 'completed');
      assert.equal(doneMsg.payload.summary.items_captured, 4);
      assert.equal(doneMsg.payload.summary.platforms.length, 2);
    }
  });

  test('handles Twitter and Google capture platforms', async () => {
    const client = new MockCaptureWorkerClient();
    client.speedMultiplier = 100;
    await client.connect();

    const items: string[] = [];
    client.onMessage((msg) => {
      if (msg.type === 'item') {
        items.push(msg.payload.platform);
      }
    });

    await client.startCapture({
      case_id: 'CASE-2026-0002',
      case_folder: '/tmp/cases/CASE-2026-0002',
      next_item_number: 1,
      platforms: ['twitter', 'google'],
      config: {
        sections: ['profile', 'feed'],
        max_items_per_section: 5,
        user_action_timeout_seconds: 60,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 150));
    client.disconnect();

    assert.ok(items.includes('twitter'));
    assert.ok(items.includes('google'));
  });
});
