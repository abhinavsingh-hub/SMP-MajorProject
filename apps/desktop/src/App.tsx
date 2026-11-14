import React, { useReducer } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Sidebar } from './components/Sidebar.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { NewCaseScreen } from './screens/NewCaseScreen.tsx';
import { CaptureScreen } from './screens/CaptureScreen.tsx';
import { ReportScreen } from './screens/ReportScreen.tsx';
import { createInitialNavigationState, navigateReducer } from './navigation/navigator.ts';
import type { ScreenName } from './navigation/types.ts';

export const App: React.FC = () => {
  const [navState, dispatch] = useReducer(navigateReducer, createInitialNavigationState('home'));

  const handleNavigate = (screen: ScreenName) => {
    dispatch({ type: 'NAVIGATE', screen });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Sidebar currentScreen={navState.currentScreen} onNavigate={handleNavigate} />
        <View style={styles.mainContent}>
          {navState.currentScreen === 'home' && <HomeScreen onNavigate={handleNavigate} />}
          {navState.currentScreen === 'new_case' && <NewCaseScreen onNavigate={handleNavigate} />}
          {navState.currentScreen === 'capture' && <CaptureScreen />}
          {navState.currentScreen === 'report' && <ReportScreen />}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F6',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8F8F6',
  },
});

export default App;
