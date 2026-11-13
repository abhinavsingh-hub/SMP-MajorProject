import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { version as appVersion } from './package.json';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />
      <View style={styles.card}>
        <Text style={styles.title}>SocialParse Mobile</Text>
        <Text style={styles.subtitle}>Forensic Social Media Capture Tool</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>v{appVersion}</Text>
        </View>
        <Text style={styles.envText}>Target: Android | Platform: NIA ACTD</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    maxWidth: 380,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  envText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
