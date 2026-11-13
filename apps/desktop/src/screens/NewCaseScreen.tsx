import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NewCaseScreenProps {
  onCaseCreated?: (caseId: string) => void;
}

export const NewCaseScreen: React.FC<NewCaseScreenProps> = () => {
  return (
    <View style={styles.container} testID="screen-new-case">
      <Text style={styles.title}>Register New Forensic Case</Text>
      <Text style={styles.description}>
        Enter the FIR details, examiner credentials, accused information, and device profile.
      </Text>
      <View style={styles.formPlaceholder}>
        <Text style={styles.placeholderText}>
          Case Creation Form initialized. Ready for P3-11 input fields & validation.
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
  formPlaceholder: {
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
