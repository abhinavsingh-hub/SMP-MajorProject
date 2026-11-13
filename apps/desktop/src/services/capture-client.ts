/**
 * Worker Protocol types and client interface (DATA_CONTRACT.md & WORKER_PROTOCOL.md)
 */

export type PlatformId = 'facebook' | 'instagram' | 'twitter' | 'google';

export interface StartRequestPayload {
  case_id: string;
  case_folder: string;
  next_item_number: number;
  platforms: PlatformId[];
  config: {
    sections: string[];
    max_items_per_section: number;
    user_action_timeout_seconds: number;
  };
}

export interface StartMessage {
  type: 'start';
  payload: StartRequestPayload;
}

export interface ProgressPayload {
  platform: PlatformId;
  section: string;
  percent: number;
  status: 'running' | 'completed';
}

export interface ProgressMessage {
  type: 'progress';
  payload: ProgressPayload;
}

export interface ItemPayload {
  item_id: string;
  platform: PlatformId;
  section: string;
  file_path: string;
  file_size_bytes: number;
  sha256: string;
  captured_at: string;
}

export interface ItemMessage {
  type: 'item';
  payload: ItemPayload;
}

export interface NeedsUserPayload {
  platform: PlatformId;
  section: string | null;
  reason: 'login' | 'otp' | 'two_factor' | 'captcha';
  message: string;
  timeout_seconds: number;
}

export interface NeedsUserMessage {
  type: 'needs_user';
  payload: NeedsUserPayload;
}

export interface ErrorPayload {
  code: string;
  message: string;
  platform: PlatformId | null;
  section: string | null;
  fatal: boolean;
}

export interface ErrorMessage {
  type: 'error';
  payload: ErrorPayload;
}

export interface DonePlatformSummary {
  platform: PlatformId;
  status: 'completed' | 'completed_with_errors' | 'failed';
  items_captured: number;
}

export interface DonePayload {
  status: 'completed' | 'completed_with_errors' | 'failed';
  started_at: string;
  finished_at: string;
  summary: {
    items_captured: number;
    errors: number;
    platforms: DonePlatformSummary[];
  };
}

export interface DoneMessage {
  type: 'done';
  payload: DonePayload;
}

export type WorkerMessage =
  | ProgressMessage
  | ItemMessage
  | NeedsUserMessage
  | ErrorMessage
  | DoneMessage;

export interface CaptureWorkerClient {
  connect(url?: string): Promise<void>;
  startCapture(request: StartRequestPayload): Promise<void>;
  onMessage(callback: (msg: WorkerMessage) => void): () => void;
  disconnect(): void;
  isConnected(): boolean;
}

/**
 * MockCaptureWorkerClient
 * Simulates capture worker events locally so the UI and testing work without Playwright.
 * Person 1 can swap in a real WebSocket client (P1-12) adhering to CaptureWorkerClient.
 */
export class MockCaptureWorkerClient implements CaptureWorkerClient {
  private listeners: Set<(msg: WorkerMessage) => void> = new Set();
  private connected = false;
  private timerIds: NodeJS.Timeout[] = [];
  public speedMultiplier = 1; // 1 = real, higher = faster (useful for tests)

  async connect(_url = 'ws://127.0.0.1:8765'): Promise<void> {
    this.connected = true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  disconnect(): void {
    this.connected = false;
    for (const t of this.timerIds) {
      clearTimeout(t);
    }
    this.timerIds = [];
  }

  onMessage(callback: (msg: WorkerMessage) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emit(msg: WorkerMessage): void {
    for (const cb of this.listeners) {
      cb(msg);
    }
  }

  async startCapture(req: StartRequestPayload): Promise<void> {
    if (!this.connected) {
      throw new Error('MockCaptureWorkerClient is not connected. Call connect() first.');
    }

    const startTime = new Date().toISOString();
    let currentItemNumber = req.next_item_number;
    let scheduledTimeMs = 50 / this.speedMultiplier;

    const schedule = (fn: () => void, delayMs: number) => {
      const id = setTimeout(fn, delayMs);
      this.timerIds.push(id);
    };

    const totalPlatforms = req.platforms.length;
    let totalItemsCaptured = 0;
    const platformSummaries: DonePlatformSummary[] = [];

    req.platforms.forEach((platform, pIdx) => {
      const basePercent = Math.floor((pIdx / totalPlatforms) * 100);

      // 1. Initial needs_user for first platform (simulates login check)
      if (pIdx === 0) {
        schedule(() => {
          this.emit({
            type: 'needs_user',
            payload: {
              platform,
              section: null,
              reason: 'login',
              message: `Checking credentials for ${platform}... Please ensure browser access is permitted.`,
              timeout_seconds: req.config.user_action_timeout_seconds || 300,
            },
          });
        }, scheduledTimeMs);
        scheduledTimeMs += 100 / this.speedMultiplier;
      }

      // 2. Progress start
      schedule(() => {
        this.emit({
          type: 'progress',
          payload: {
            platform,
            section: 'profile',
            percent: basePercent + 5,
            status: 'running',
          },
        });
      }, scheduledTimeMs);
      scheduledTimeMs += 100 / this.speedMultiplier;

      // 3. Item captured (profile)
      const itemId1 = `ITEM-${String(currentItemNumber).padStart(4, '0')}`;
      currentItemNumber++;
      totalItemsCaptured++;

      schedule(() => {
        this.emit({
          type: 'item',
          payload: {
            item_id: itemId1,
            platform,
            section: 'profile',
            file_path: `${platform}/screenshots/${platform}_profile_${itemId1.slice(5)}_20261113T100000Z.png`,
            file_size_bytes: 350124,
            sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            captured_at: new Date().toISOString(),
          },
        });
      }, scheduledTimeMs);
      scheduledTimeMs += 100 / this.speedMultiplier;

      // 4. Feed progress & item
      schedule(() => {
        this.emit({
          type: 'progress',
          payload: {
            platform,
            section: 'feed',
            percent: basePercent + 15,
            status: 'running',
          },
        });
      }, scheduledTimeMs);
      scheduledTimeMs += 100 / this.speedMultiplier;

      const itemId2 = `ITEM-${String(currentItemNumber).padStart(4, '0')}`;
      currentItemNumber++;
      totalItemsCaptured++;

      schedule(() => {
        this.emit({
          type: 'item',
          payload: {
            item_id: itemId2,
            platform,
            section: 'feed',
            file_path: `${platform}/screenshots/${platform}_feed_${itemId2.slice(5)}_20261113T100005Z.png`,
            file_size_bytes: 492011,
            sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
            captured_at: new Date().toISOString(),
          },
        });
      }, scheduledTimeMs);
      scheduledTimeMs += 100 / this.speedMultiplier;

      // 5. Section complete
      schedule(() => {
        this.emit({
          type: 'progress',
          payload: {
            platform,
            section: 'feed',
            percent: Math.floor(((pIdx + 1) / totalPlatforms) * 100),
            status: 'completed',
          },
        });
      }, scheduledTimeMs);
      scheduledTimeMs += 100 / this.speedMultiplier;

      platformSummaries.push({
        platform,
        status: 'completed',
        items_captured: 2,
      });
    });

    // Final done message
    schedule(() => {
      this.emit({
        type: 'done',
        payload: {
          status: 'completed',
          started_at: startTime,
          finished_at: new Date().toISOString(),
          summary: {
            items_captured: totalItemsCaptured,
            errors: 0,
            platforms: platformSummaries,
          },
        },
      });
    }, scheduledTimeMs);
  }
}
