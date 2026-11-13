import type { NavigationState, ScreenName } from './types.ts';

export function createInitialNavigationState(initialScreen: ScreenName = 'home'): NavigationState {
  return {
    currentScreen: initialScreen,
    history: [initialScreen],
    params: {},
  };
}

export function navigateReducer(
  state: NavigationState,
  action:
    | { type: 'NAVIGATE'; screen: ScreenName; params?: Record<string, unknown> }
    | { type: 'GO_BACK' },
): NavigationState {
  if (action.type === 'NAVIGATE') {
    return {
      currentScreen: action.screen,
      history: [...state.history, action.screen],
      params: action.params ?? {},
    };
  }

  if (action.type === 'GO_BACK') {
    if (state.history.length <= 1) return state;
    const newHistory = state.history.slice(0, -1);
    return {
      currentScreen: newHistory[newHistory.length - 1],
      history: newHistory,
      params: {},
    };
  }

  return state;
}
