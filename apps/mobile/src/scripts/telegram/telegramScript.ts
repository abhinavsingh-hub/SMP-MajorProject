import type { Step } from '../../runner/types';
import { TELEGRAM_LABELS } from './labels';

export interface TelegramScriptOptions {
  maxChats: number;
  scrollsPerSection: number;
}

/**
 * Builds a deterministic, forensic capture script for official Telegram Android.
 * All label-dependent UI interactions are marked `optional: true` with `retries: 1`
 * to ensure that language/version discrepancies never crash an evidentiary run.
 */
export function buildTelegramScript(options: TelegramScriptOptions): Step[] {
  const { maxChats, scrollsPerSection } = options;
  const steps: Step[] = [];

  // =========================================================================
  // Phase 1: Launch & Primary Chat List Capture
  // =========================================================================
  steps.push({
    kind: 'launchApp',
    packageName: TELEGRAM_LABELS.PACKAGE_NAME,
    label: 'Launch Telegram',
  });

  steps.push({
    kind: 'waitForText',
    text: TELEGRAM_LABELS.HEADER_TITLE,
    timeoutMs: 8000,
    optional: true,
    retries: 1,
    label: "Wait for Telegram main view ('Telegram')",
  });

  steps.push({
    kind: 'capture',
    section: 'chat_list_main',
    source: 'telegram',
    label: 'Capture initial chat list',
  });

  for (let s = 1; s <= scrollsPerSection; s++) {
    steps.push({
      kind: 'scroll',
      times: 1,
      delayMs: 400,
      label: `Scroll chat list (${s}/${scrollsPerSection})`,
    });
    steps.push({
      kind: 'capture',
      section: `chat_list_scroll_${s}`,
      source: 'telegram',
      label: `Capture chat list scrolled page ${s}`,
    });
  }

  // =========================================================================
  // Phase 2: Target Account Profile & Identifier Capture
  // =========================================================================
  steps.push({
    kind: 'clickByText',
    text: TELEGRAM_LABELS.NAV_DRAWER_BUTTON,
    optional: true,
    retries: 1,
    label: 'Open navigation drawer for Settings',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
    label: 'Wait for drawer animation',
  });

  steps.push({
    kind: 'clickByText',
    text: TELEGRAM_LABELS.MENU_SETTINGS,
    optional: true,
    retries: 1,
    label: 'Select Settings menu item',
  });

  steps.push({
    kind: 'waitForText',
    text: TELEGRAM_LABELS.SETTINGS_TITLE,
    timeoutMs: 4000,
    optional: true,
    retries: 1,
    label: 'Wait for Settings screen',
  });

  steps.push({
    kind: 'capture',
    section: 'account_info',
    source: 'telegram',
    label: 'Capture account details (phone, username, bio)',
  });

  steps.push({
    kind: 'back',
    label: 'Return from Settings to chat list',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  // =========================================================================
  // Phase 3: Contacts List Capture
  // =========================================================================
  steps.push({
    kind: 'clickByText',
    text: TELEGRAM_LABELS.NAV_DRAWER_BUTTON,
    optional: true,
    retries: 1,
    label: 'Open navigation drawer for Contacts',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  steps.push({
    kind: 'clickByText',
    text: TELEGRAM_LABELS.MENU_CONTACTS,
    optional: true,
    retries: 1,
    label: 'Select Contacts menu item',
  });

  steps.push({
    kind: 'waitForText',
    text: TELEGRAM_LABELS.CONTACTS_TITLE,
    timeoutMs: 4000,
    optional: true,
    retries: 1,
    label: 'Wait for Contacts screen',
  });

  steps.push({
    kind: 'capture',
    section: 'contacts_page_1',
    source: 'telegram',
    label: 'Capture initial contacts list',
  });

  for (let s = 1; s <= scrollsPerSection; s++) {
    steps.push({
      kind: 'scroll',
      times: 1,
      delayMs: 400,
      label: `Scroll contacts (${s}/${scrollsPerSection})`,
    });
    steps.push({
      kind: 'capture',
      section: `contacts_scroll_${s}`,
      source: 'telegram',
      label: `Capture contacts scrolled page ${s}`,
    });
  }

  steps.push({
    kind: 'back',
    label: 'Return from Contacts to chat list',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  // =========================================================================
  // Phase 4: Individual Top Chats Feed Capture
  // =========================================================================
  for (let c = 1; c <= maxChats; c++) {
    steps.push({
      kind: 'clickByViewId',
      id: TELEGRAM_LABELS.ID_DIALOG_CELL,
      optional: true,
      retries: 1,
      label: `Open chat dialogue #${c}`,
    });

    steps.push({
      kind: 'delay',
      ms: 600,
      label: `Wait for chat #${c} message surface load`,
    });

    steps.push({
      kind: 'capture',
      section: `chat_${c}_initial`,
      source: 'telegram',
      label: `Capture chat #${c} bottom view`,
    });

    for (let s = 1; s <= scrollsPerSection; s++) {
      steps.push({
        kind: 'scroll',
        times: 1,
        delayMs: 400,
        label: `Scroll messages up in chat #${c} (${s}/${scrollsPerSection})`,
      });
      steps.push({
        kind: 'capture',
        section: `chat_${c}_scroll_${s}`,
        source: 'telegram',
        label: `Capture messages scroll #${s} in chat #${c}`,
      });
    }

    steps.push({
      kind: 'back',
      label: `Exit chat #${c} back to conversation list`,
    });

    steps.push({
      kind: 'delay',
      ms: 400,
    });
  }

  // =========================================================================
  // Phase 5: Folder Filtering (Groups & Channels)
  // =========================================================================
  steps.push({
    kind: 'clickByText',
    text: TELEGRAM_LABELS.FOLDER_GROUPS,
    optional: true,
    retries: 1,
    label: 'Select Groups folder tab (if present)',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  steps.push({
    kind: 'capture',
    section: 'folder_groups',
    source: 'telegram',
    optional: true,
    label: 'Capture filtered Groups folder chat list',
  });

  steps.push({
    kind: 'clickByText',
    text: TELEGRAM_LABELS.FOLDER_CHANNELS,
    optional: true,
    retries: 1,
    label: 'Select Channels folder tab (if present)',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  steps.push({
    kind: 'capture',
    section: 'folder_channels',
    source: 'telegram',
    optional: true,
    label: 'Capture filtered Channels folder chat list',
  });

  steps.push({
    kind: 'clickByText',
    text: TELEGRAM_LABELS.FOLDER_ALL,
    optional: true,
    retries: 1,
    label: 'Restore All Chats folder view',
  });

  return steps;
}
