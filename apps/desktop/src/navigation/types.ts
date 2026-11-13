export type ScreenName = 'home' | 'new_case' | 'capture' | 'report';

export interface NavigationState {
  currentScreen: ScreenName;
  history: ScreenName[];
  params?: Record<string, unknown>;
}

export interface NavigationContextValue {
  state: NavigationState;
  navigate: (screen: ScreenName, params?: Record<string, unknown>) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}
