import type { Step } from '../../runner/types';
import { WHATSAPP_LABELS } from './labels';

export interface WhatsAppScriptOptions {
  maxChats: number;
  scrollsPerSection: number;
}

/**
 * Builds a deterministic, forensic capture script for official WhatsApp Android.
 * All label-dependent UI interactions are marked `optional: true` with `retries: 1`
 * to ensure that language/version discrepancies never crash an evidentiary run.
 */
export function buildWhatsAppScript(options: WhatsAppScriptOptions): Step[] {
  const { maxChats, scrollsPerSection } = options;
  const steps: Step[] = [];

  // =========================================================================
  // Phase 1: Launch & Primary Chat List Capture
  // =========================================================================
  steps.push({
    kind: 'launchApp',
    packageName: WHATSAPP_LABELS.PACKAGE_NAME,
    label: 'Launch WhatsApp',
  });

  steps.push({
    kind: 'waitForText',
    text: WHATSAPP_LABELS.TAB_CHATS,
    timeoutMs: 8000,
    optional: true,
    retries: 1,
    label: "Wait for WhatsApp chat list ('Chats')",
  });

  steps.push({
    kind: 'capture',
    section: 'chat_list_main',
    source: 'whatsapp',
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
      source: 'whatsapp',
      label: `Capture chat list scrolled page ${s}`,
    });
  }

  // =========================================================================
  // Phase 2: Settings → Profile & Account Info
  // =========================================================================
  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.MENU_OVERFLOW,
    optional: true,
    retries: 1,
    label: 'Open overflow menu (More options)',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
    label: 'Wait for overflow menu animation',
  });

  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.MENU_SETTINGS,
    optional: true,
    retries: 1,
    label: 'Select Settings menu item',
  });

  steps.push({
    kind: 'waitForText',
    text: WHATSAPP_LABELS.SETTINGS_TITLE,
    timeoutMs: 4000,
    optional: true,
    retries: 1,
    label: 'Wait for Settings screen',
  });

  steps.push({
    kind: 'capture',
    section: 'settings_main',
    source: 'whatsapp',
    label: 'Capture Settings main screen',
  });

  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.SETTINGS_PROFILE,
    optional: true,
    retries: 1,
    label: 'Open Profile settings',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  steps.push({
    kind: 'capture',
    section: 'profile_info',
    source: 'whatsapp',
    label: 'Capture profile info (name, status, phone number)',
  });

  steps.push({
    kind: 'back',
    label: 'Back to Settings',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  // =========================================================================
  // Phase 3: Linked Devices
  // =========================================================================
  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.SETTINGS_LINKED_DEVICES,
    optional: true,
    retries: 1,
    label: 'Open Linked Devices from Settings',
  });

  steps.push({
    kind: 'delay',
    ms: 600,
  });

  steps.push({
    kind: 'capture',
    section: 'linked_devices',
    source: 'whatsapp',
    label: 'Capture linked devices list',
  });

  steps.push({
    kind: 'back',
    label: 'Back to Settings from Linked Devices',
  });

  steps.push({
    kind: 'back',
    label: 'Back from Settings to chat list',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  // =========================================================================
  // Phase 4: Contacts List Capture
  // =========================================================================
  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.MENU_NEW_CHAT,
    optional: true,
    retries: 1,
    label: 'Open Contacts via New Chat button',
  });

  steps.push({
    kind: 'waitForText',
    text: WHATSAPP_LABELS.CONTACTS_TITLE,
    timeoutMs: 4000,
    optional: true,
    retries: 1,
    label: 'Wait for Contacts picker screen',
  });

  steps.push({
    kind: 'capture',
    section: 'contacts_page_1',
    source: 'whatsapp',
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
      source: 'whatsapp',
      label: `Capture contacts scrolled page ${s}`,
    });
  }

  steps.push({
    kind: 'back',
    label: 'Back from Contacts to chat list',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  // =========================================================================
  // Phase 5: Individual Chats Feed Capture
  // =========================================================================
  for (let c = 1; c <= maxChats; c++) {
    steps.push({
      kind: 'clickByViewId',
      id: WHATSAPP_LABELS.ID_CHAT_ROW,
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
      source: 'whatsapp',
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
        source: 'whatsapp',
        label: `Capture messages scroll #${s} in chat #${c}`,
      });
    }

    // Optional Group info capture if this conversation is a group
    steps.push({
      kind: 'clickByText',
      text: WHATSAPP_LABELS.GROUP_INFO,
      optional: true,
      retries: 1,
      label: `Open group info for chat #${c}`,
    });

    steps.push({
      kind: 'delay',
      ms: 400,
    });

    steps.push({
      kind: 'capture',
      section: `chat_${c}_group_info`,
      source: 'whatsapp',
      optional: true,
      label: `Capture group participants for chat #${c}`,
    });

    steps.push({
      kind: 'back',
      optional: true,
      label: `Back from group info (chat #${c})`,
    });

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
  // Phase 6: Communities & Calls Tabs
  // =========================================================================
  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.TAB_COMMUNITIES,
    optional: true,
    retries: 1,
    label: 'Open Communities tab',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  steps.push({
    kind: 'capture',
    section: 'communities_tab',
    source: 'whatsapp',
    optional: true,
    label: 'Capture Communities tab view',
  });

  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.TAB_CALLS,
    optional: true,
    retries: 1,
    label: 'Open Calls tab',
  });

  steps.push({
    kind: 'delay',
    ms: 400,
  });

  steps.push({
    kind: 'capture',
    section: 'calls_tab',
    source: 'whatsapp',
    optional: true,
    label: 'Capture Calls tab view',
  });

  steps.push({
    kind: 'clickByText',
    text: WHATSAPP_LABELS.TAB_CHATS,
    optional: true,
    retries: 1,
    label: 'Return to Chats tab',
  });

  return steps;
}
