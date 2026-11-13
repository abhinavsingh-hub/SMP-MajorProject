import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const CaptureScreen: React.FC = () => {
  return (
    <View style={styles.container} testID="screen-capture">
      <Text style={styles.title}>Automated Evidence Capture</Text>
      <Text style={styles.description}>
        Select social media feeds to harvest and monitor live worker protocol events.
      </Text>
      <View style={styles.card}>
        <Text style={styles.placeholderText}>
          Capture Dashboard initialized. Ready for P3-12 platform selector & worker streaming.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  card: {
    padding: 24,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  placeholderText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
});
