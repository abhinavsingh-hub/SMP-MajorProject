import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const ReportScreen: React.FC = () => {
  return (
    <View style={styles.container} testID="screen-report">
      <Text style={styles.title}>Forensic Report & Verification</Text>
      <Text style={styles.description}>
        Review Section 65B Panchnama, verify SHA-256 hash chains, and export PDF/HTML bundle.
      </Text>
      <View style={styles.card}>
        <Text style={styles.placeholderText}>
          Report Viewer initialized. Generates tamper-proof Panchnama certificates with embedded QR codes.
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
