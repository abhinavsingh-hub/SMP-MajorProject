import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import type { CaptureScreenProps } from '../navigation/types';

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ route }) => {
  const { platform, caseNumber, examinerName, accusedName } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{platform.toUpperCase()} EVIDENCE CAPTURE</Text>
        </View>

        <Text style={styles.title}>Capture coming soon</Text>
        <Text style={styles.subtitle}>
          Automated screen projection and anti-tamper forensic capture pipeline is being initialized.
        </Text>

        <View style={styles.detailsTable}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Case Reference:</Text>
            <Text style={styles.detailValue}>{caseNumber}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Target Platform:</Text>
            <Text style={styles.detailValue}>{platform}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lead Examiner:</Text>
            <Text style={styles.detailValue}>{examinerName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Accused / Subject:</Text>
            <Text style={styles.detailValue}>{accusedName}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#0369a130',
    borderWidth: 1,
    borderColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 16,
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  detailsTable: {
    width: '100%',
    backgroundColor: '#1e293b50',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
});
