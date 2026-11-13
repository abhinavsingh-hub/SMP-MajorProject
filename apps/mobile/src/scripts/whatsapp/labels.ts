/**
 * UI labels, content descriptions, and View IDs for the official WhatsApp Android app
 * (package: com.whatsapp).
 *
 * HOW TO INSPECT / UPDATE ON A RUNNING DEVICE OR EMULATOR:
 * 1. Open the target screen in WhatsApp.
 * 2. Run: `adb shell uiautomator dump /sdcard/window_dump.xml`
 * 3. Pull or view: `adb shell cat /sdcard/window_dump.xml | grep -i "content-desc"`
 * 4. Verify attribute matching:
 *    - For buttons/icons without text, inspect `content-desc="..."`
 *    - For headers and menu items, inspect `text="..."`
 *    - For resource IDs, inspect `resource-id="com.whatsapp:id/..."`
 */
export const WHATSAPP_LABELS = {
  // Package identifier
  PACKAGE_NAME: 'com.whatsapp',

  // Top header text / app title in chat list
  // Inspect via: text="WhatsApp"
  HEADER_WHATSAPP: 'WhatsApp',

  // Bottom or top navigation tabs
  // Inspect via: content-desc="Chats" or text="Chats"
  TAB_CHATS: 'Chats',
  TAB_STATUS: 'Status',
  TAB_UPDATES: 'Updates',
  TAB_COMMUNITIES: 'Communities',
  TAB_CALLS: 'Calls',

  // Action bar / overflow menu
  // Inspect via: content-desc="More options"
  MENU_OVERFLOW: 'More options',
  MENU_SETTINGS: 'Settings',
  MENU_NEW_GROUP: 'New group',
  MENU_NEW_BROADCAST: 'New broadcast',
  MENU_LINKED_DEVICES: 'Linked devices',
  MENU_STARRED_MESSAGES: 'Starred messages',
  MENU_PAYMENTS: 'Payments',

  // Floating Action Button / New Chat
  // Inspect via: content-desc="New chat" or text="New chat"
  MENU_NEW_CHAT: 'New chat',

  // Settings screen sections
  // Inspect via: text="Settings", text="Account", text="Privacy", text="Avatar", text="Chats"
  SETTINGS_TITLE: 'Settings',
  SETTINGS_PROFILE: 'Profile',
  SETTINGS_ACCOUNT: 'Account',
  SETTINGS_PRIVACY: 'Privacy',
  SETTINGS_CHATS: 'Chats',
  SETTINGS_LINKED_DEVICES: 'Linked devices',

  // Profile details
  // Inspect via: text="Name", text="About", text="Phone"
  PROFILE_NAME_FIELD: 'Name',
  PROFILE_STATUS_FIELD: 'About',
  PROFILE_NUMBER_LABEL: 'Phone',

  // Contacts picker
  // Inspect via: text="Select contact"
  CONTACTS_TITLE: 'Select contact',
  NEW_CONTACT_BUTTON: 'New contact',

  // Group info screen
  // Inspect via: text="Group info", text="Participants"
  GROUP_INFO: 'Group info',
  PARTICIPANTS_LABEL: 'Participants',

  // WhatsApp resource IDs
  // Inspect via: `grep -i "resource-id=\"com.whatsapp:id/"` in uiautomator dump
  ID_CHAT_LIST: 'com.whatsapp:id/conversations_rv',
  ID_CHAT_ROW: 'com.whatsapp:id/conversation_contact_name',
  ID_SEARCH_BUTTON: 'com.whatsapp:id/menuitem_search',
  ID_ACTION_BAR: 'com.whatsapp:id/action_bar',
  ID_FAB: 'com.whatsapp:id/fab',
} as const;
