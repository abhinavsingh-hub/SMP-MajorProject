import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialNavigationState,
  navigateReducer,
} from '../src/navigation/navigator.ts';

describe('Desktop App Shell Navigation (P3-10)', () => {
  test('initializes with home screen by default', () => {
    const state = createInitialNavigationState();
    assert.equal(state.currentScreen, 'home');
    assert.deepEqual(state.history, ['home']);
    assert.deepEqual(state.params, {});
  });

  test('can initialize with a custom starting screen', () => {
    const state = createInitialNavigationState('new_case');
    assert.equal(state.currentScreen, 'new_case');
    assert.deepEqual(state.history, ['new_case']);
  });

  test('navigates from home to new_case, capture, and report', () => {
    let state = createInitialNavigationState('home');

    state = navigateReducer(state, { type: 'NAVIGATE', screen: 'new_case' });
    assert.equal(state.currentScreen, 'new_case');
    assert.deepEqual(state.history, ['home', 'new_case']);

    state = navigateReducer(state, {
      type: 'NAVIGATE',
      screen: 'capture',
      params: { caseId: 'CASE-20261113-ABCD' },
    });
    assert.equal(state.currentScreen, 'capture');
    assert.equal(state.params?.caseId, 'CASE-20261113-ABCD');
    assert.deepEqual(state.history, ['home', 'new_case', 'capture']);

    state = navigateReducer(state, { type: 'NAVIGATE', screen: 'report' });
    assert.equal(state.currentScreen, 'report');
    assert.deepEqual(state.history, ['home', 'new_case', 'capture', 'report']);
  });

  test('navigates back using GO_BACK action', () => {
    let state = createInitialNavigationState('home');
    state = navigateReducer(state, { type: 'NAVIGATE', screen: 'new_case' });
    state = navigateReducer(state, { type: 'NAVIGATE', screen: 'capture' });

    assert.equal(state.currentScreen, 'capture');

    state = navigateReducer(state, { type: 'GO_BACK' });
    assert.equal(state.currentScreen, 'new_case');
    assert.deepEqual(state.history, ['home', 'new_case']);

    state = navigateReducer(state, { type: 'GO_BACK' });
    assert.equal(state.currentScreen, 'home');
    assert.deepEqual(state.history, ['home']);

    // Attempting to go back further should be a no-op
    state = navigateReducer(state, { type: 'GO_BACK' });
    assert.equal(state.currentScreen, 'home');
    assert.deepEqual(state.history, ['home']);
  });
});
