/**
 * UI labels, content descriptions, and View IDs for the official Telegram Android app
 * (package: org.telegram.messenger).
 *
 * HOW TO INSPECT / UPDATE ON A RUNNING DEVICE OR EMULATOR:
 * 1. Open the target screen in Telegram.
 * 2. Run: `adb shell uiautomator dump /sdcard/window_dump.xml`
 * 3. Pull or view: `adb shell cat /sdcard/window_dump.xml | grep -i "content-desc"`
 * 4. Verify attribute matching:
 *    - For buttons/icons without text, inspect `content-desc="..."`
 *    - For headers and menu items, inspect `text="..."`
 *    - For resource IDs, inspect `resource-id="org.telegram.messenger:id/..."`
 */
export const TELEGRAM_LABELS = {
  // Package identifier
  PACKAGE_NAME: 'org.telegram.messenger',

  // Navigation drawer toggle
  // Inspect via: `grep -i "Open navigation menu"` or content-desc="Open navigation menu"
  NAV_DRAWER_BUTTON: 'Open navigation menu',

  // Top header text / app title in chat list
  // Inspect via: text="Telegram" or text="Chats"
  HEADER_TITLE: 'Telegram',
  CHATS_TAB: 'Chats',

  // Side menu items
  // Inspect via: text="Settings", text="Contacts", etc. in navigation drawer
  MENU_NEW_GROUP: 'New Group',
  MENU_CONTACTS: 'Contacts',
  MENU_CALLS: 'Calls',
  MENU_SAVED_MESSAGES: 'Saved Messages',
  MENU_SETTINGS: 'Settings',

  // Settings screen sections
  // Inspect via: text="Account", text="Bio", text="Username", text="Phone"
  SETTINGS_TITLE: 'Settings',
  SETTINGS_ACCOUNT_SECTION: 'Account',
  SETTINGS_USERNAME_LABEL: 'Username',
  SETTINGS_BIO_LABEL: 'Bio',

  // Contacts screen
  // Inspect via: text="Contacts", text="Invite Friends", text="Find People Nearby"
  CONTACTS_TITLE: 'Contacts',
  CONTACTS_FIND_NEARBY: 'Find People Nearby',

  // Folder tabs (if user has enabled folders)
  // Inspect via: text="All Chats", text="Groups", text="Channels"
  FOLDER_ALL: 'All Chats',
  FOLDER_GROUPS: 'Groups',
  FOLDER_CHANNELS: 'Channels',

  // Search and chat list item IDs
  // Inspect via: resource-id="org.telegram.messenger:id/..."
  ID_SEARCH_BUTTON: 'org.telegram.messenger:id/menu_search',
  ID_CHATS_LIST: 'org.telegram.messenger:id/chats_list',
  ID_DIALOG_CELL: 'org.telegram.messenger:id/dialog_cell',
  ID_CHAT_MESSAGE_LIST: 'org.telegram.messenger:id/chat_list_view',
  ID_ACTION_BAR: 'org.telegram.messenger:id/action_bar',
} as const;
