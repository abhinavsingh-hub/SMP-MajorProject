/**
 * Instagram Android UI selectors. Find current values by opening each screen,
 * running `adb shell uiautomator dump /sdcard/window_dump.xml`, then reading
 * `adb shell cat /sdcard/window_dump.xml`; match `text`, `content-desc`, and
 * `resource-id` attributes. IDs are version dependent and should be refreshed
 * from the dump on the target device.
 */
export const INSTAGRAM_LABELS = {
  // Package name is verified from the installed app with `adb shell pm list packages | grep instagram`.
  PACKAGE_NAME: 'com.instagram.android',
  // Profile tab: inspect its `content-desc` in the bottom navigation dump.
  TAB_PROFILE: 'Profile',
  // Inbox entry: inspect `content-desc` or `text` for the paper-plane/Messages control.
  TAB_MESSAGES: 'Messages',
  // Profile actions: inspect `text` or `content-desc` after opening the profile menu.
  MENU_SETTINGS: 'Settings and privacy',
  SETTINGS_YOUR_ACTIVITY: 'Your activity',
  SETTINGS_ACCOUNT_INFO: 'Account Center',
  // Profile sections: inspect `text` attributes in the profile header dump.
  PROFILE_EDIT: 'Edit profile',
  PROFILE_FOLLOWERS: 'followers',
  PROFILE_FOLLOWING: 'following',
  PROFILE_POSTS: 'posts',
  // Inbox sections and post dialog controls: inspect `text` and `content-desc` values.
  INBOX_TITLE: 'Messages',
  POST_OPTIONS: 'More options',
  // IDs: inspect the `resource-id` attribute in dumps of profile grid, feed, and inbox.
  ID_PROFILE_GRID: 'com.instagram.android:id/recyclerview_profile_grid',
  ID_POST_CELL: 'com.instagram.android:id/image_button',
  ID_INBOX_LIST: 'com.instagram.android:id/recycler_view',
  ID_PROFILE_MENU: 'com.instagram.android:id/action_bar_button_options',
} as const;
