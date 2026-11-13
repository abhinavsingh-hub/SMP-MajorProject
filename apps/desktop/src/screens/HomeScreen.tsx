import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { ScreenName } from '../navigation/types.ts';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
  activeCaseId?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate, activeCaseId }) => {
  return (
    <View style={styles.container} testID="screen-home">
      <View style={styles.header}>
        <Text style={styles.title}>SocialParse Desktop</Text>
        <Text style={styles.subtitle}>
          Digital Evidence Capture & Forensic Parser (BSA 2023 / Section 65B Compliant)
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Session</Text>
        <Text style={styles.cardBody}>
          {activeCaseId ? `Active Case: ${activeCaseId}` : 'No active case loaded.'}
        </Text>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('new_case')}
          testID="btn-nav-new-case"
        >
          <Text style={styles.actionButtonText}>Create New Case</Text>
          <Text style={styles.actionButtonSubtext}>Register FIR, examiner & device details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('capture')}
          testID="btn-nav-capture"
        >
          <Text style={styles.actionButtonText}>Capture Evidence</Text>
          <Text style={styles.actionButtonSubtext}>Select platforms and start automated worker</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('report')}
          testID="btn-nav-report"
        >
          <Text style={styles.actionButtonText}>Verify & Report</Text>
          <Text style={styles.actionButtonSubtext}>
            Verify hash chains and generate Section 65B Panchnama
          </Text>
        </TouchableOpacity>
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
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 16,
    color: '#e2e8f0',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#38bdf8',
    marginBottom: 6,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
