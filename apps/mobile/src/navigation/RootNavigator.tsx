import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CaseInfoScreen } from '../screens/CaseInfoScreen';
import { CaptureScreen } from '../screens/CaptureScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#090d16',
          },
          headerTintColor: '#38bdf8',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor: '#090d16',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Target Platforms' }}
        />
        <Stack.Screen
          name="CaseInfo"
          component={CaseInfoScreen}
          options={{ title: 'Case Information' }}
        />
        <Stack.Screen
          name="Capture"
          component={CaptureScreen}
          options={{ title: 'Forensic Capture' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
