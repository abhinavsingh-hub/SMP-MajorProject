import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { CaseInfoScreenProps } from '../navigation/types';
import { EvidenceService } from '../evidence/EvidenceService';

export const CaseInfoScreen: React.FC<CaseInfoScreenProps> = ({ route, navigation }) => {
  const { platform } = route.params;

  const [caseNumber, setCaseNumber] = useState('');
  const [examinerName, setExaminerName] = useState('');
  const [accusedName, setAccusedName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!caseNumber.trim()) {
      newErrors.caseNumber = 'Case number is required (e.g. CASE-2026-0042)';
    }
    if (!examinerName.trim()) {
      newErrors.examinerName = 'Examiner name and badge ID are required';
    }
    if (!accusedName.trim()) {
      newErrors.accusedName = 'Accused name / handle is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      const evidenceService = new EvidenceService();

      const created = await evidenceService.createCase({
        caseNumber: caseNumber.trim(),
        examinerName: examinerName.trim(),
        accusedName: accusedName.trim(),
        platform,
      });

      await evidenceService.recordCaptureStart(platform);

      navigation.navigate('Capture', {
        platform,
        caseNumber: caseNumber.trim(),
        examinerName: examinerName.trim(),
        accusedName: accusedName.trim(),
        caseDir: created.caseFolderPath,
      });
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setErrors((prev) => ({ ...prev, general: errStr }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.badgeContainer}>
            <Text style={styles.targetLabel}>Target Platform</Text>
            <Text style={styles.targetBadge}>{platform}</Text>
          </View>

          {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Case / FIR Number *</Text>
            <TextInput
              style={[styles.input, errors.caseNumber ? styles.inputError : null]}
              placeholder="e.g. CASE-2026-0042"
              placeholderTextColor="#64748b"
              value={caseNumber}
              onChangeText={(val) => {
                setCaseNumber(val);
                if (errors.caseNumber) setErrors((prev) => ({ ...prev, caseNumber: '' }));
              }}
              autoCapitalize="characters"
              editable={!isSubmitting}
            />
            {errors.caseNumber ? <Text style={styles.errorText}>{errors.caseNumber}</Text> : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Examiner Name / Badge ID *</Text>
            <TextInput
              style={[styles.input, errors.examinerName ? styles.inputError : null]}
              placeholder="e.g. Insp. V. Sharma (ACTD-441)"
              placeholderTextColor="#64748b"
              value={examinerName}
              onChangeText={(val) => {
                setExaminerName(val);
                if (errors.examinerName) setErrors((prev) => ({ ...prev, examinerName: '' }));
              }}
              editable={!isSubmitting}
            />
            {errors.examinerName ? (
              <Text style={styles.errorText}>{errors.examinerName}</Text>
            ) : null}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Accused Name / Profile *</Text>
            <TextInput
              style={[styles.input, errors.accusedName ? styles.inputError : null]}
              placeholder="e.g. Target Handle / Legal Name"
              placeholderTextColor="#64748b"
              value={accusedName}
              onChangeText={(val) => {
                setAccusedName(val);
                if (errors.accusedName) setErrors((prev) => ({ ...prev, accusedName: '' }));
              }}
              editable={!isSubmitting}
            />
            {errors.accusedName ? <Text style={styles.errorText}>{errors.accusedName}</Text> : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={handleStart}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Initialize Case & Start Session</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  targetBadge: {
    fontSize: 14,
    color: '#38bdf8',
    fontWeight: '700',
    backgroundColor: '#0369a120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
  },
  generalError: {
    fontSize: 13,
    color: '#ef4444',
    backgroundColor: '#ef444415',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef444450',
  },
  button: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonPressed: {
    backgroundColor: '#0369a1',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
