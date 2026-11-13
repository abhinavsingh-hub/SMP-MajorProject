/**
 * Facebook Android selectors. To refresh any value, navigate to its screen,
 * run `adb shell uiautomator dump /sdcard/window_dump.xml`, then inspect the XML
 * with `adb shell cat /sdcard/window_dump.xml`; identify UI text via `text`,
 * accessibility labels via `content-desc`, and IDs via `resource-id`.
 */
export const FACEBOOK_LABELS = {
  // Verify package using `adb shell pm list packages | grep facebook`.
  PACKAGE_NAME: 'com.facebook.katana',
  // Inspect bottom navigation `content-desc` or `text` for Profile and Photos.
  TAB_PROFILE: 'Profile',
  TAB_PHOTOS: 'Photos',
  TAB_MESSAGES: 'Messages',
  // Inspect profile screen text for About, Intro and Friends links.
  PROFILE_ABOUT: 'About',
  PROFILE_INTRO: 'See your About info',
  PROFILE_FRIENDS: 'Friends',
  PROFILE_POSTS: 'Posts',
  // Open a visible feed card using its dumped resource-id; verify on-device as IDs vary.
  ID_POST_CARD: 'com.facebook.katana:id/recycler_view',
  // Inspect the profile menu or settings screen for these text values.
  MENU_MORE: 'More',
  MENU_SETTINGS: 'Settings & privacy',
  SETTINGS_TITLE: 'Settings',
  // Inspect inbox title and profile/timeline list IDs in the XML dump.
  INBOX_TITLE: 'Chats',
  ID_TIMELINE: 'com.facebook.katana:id/recycler_view',
  ID_FRIENDS_LIST: 'com.facebook.katana:id/recycler_view',
  ID_INBOX_LIST: 'com.facebook.katana:id/recycler_view',
} as const;
