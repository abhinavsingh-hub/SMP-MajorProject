import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  validateCaseForm,
  createDesktopCase,
  type CaseFormState,
} from '../services/case-service.ts';
import type { ScreenName } from '../navigation/types.ts';

interface NewCaseScreenProps {
  baseDirectory?: string;
  onCaseCreated?: (caseId: string, folderPath: string) => void;
  onNavigate?: (screen: ScreenName) => void;
}

export const NewCaseScreen: React.FC<NewCaseScreenProps> = ({
  baseDirectory = '/tmp/smp_cases',
  onCaseCreated,
  onNavigate,
}) => {
  const [form, setForm] = useState<CaseFormState>({
    caseNumber: '',
    examinerName: '',
    examinerDesignation: 'Cyber Forensics Officer',
    accusedName: '',
    agency: 'State Cyber Crime Investigation Cell',
    deviceType: 'desktop',
    deviceName: 'Workstation-01 (macOS)',
    remarks: 'Evidence seizure under Section 65B IEA / Sec 63 BSA',
  });

  const [basePath, setBasePath] = useState(baseDirectory);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    caseId: string;
    folderPath: string;
  } | null>(null);

  const updateField = (field: keyof CaseFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCreateCase = async () => {
    const validation = validateCaseForm(form);
    if (!validation.valid || !validation.input) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const result = await createDesktopCase(basePath, validation.input);
      setSuccessInfo({
        caseId: result.caseData.case_id,
        folderPath: result.caseFolderPath,
      });
      if (onCaseCreated) {
        onCaseCreated(result.caseData.case_id, result.caseFolderPath);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} testID="screen-new-case">
      <View style={styles.header}>
        <Text style={styles.title}>Register New Forensic Case</Text>
        <Text style={styles.subtitle}>
          Creates a tamper-evident case repository with initial manifest, audit log, and Section 65B metadata.
        </Text>
      </View>

      {successInfo ? (
        <View style={styles.successBanner} testID="case-success-banner">
          <Text style={styles.successTitle}>✓ Case Created Successfully</Text>
          <Text style={styles.successText}>Case ID: {successInfo.caseId}</Text>
          <Text style={styles.successSubtext}>Path: {successInfo.folderPath}</Text>
          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => onNavigate?.('capture')}
              testID="btn-proceed-capture"
            >
              <Text style={styles.proceedButtonText}>Proceed to Evidence Capture →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.newAnotherButton}
              onPress={() => setSuccessInfo(null)}
            >
              <Text style={styles.newAnotherButtonText}>Register Another Case</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.formCard}>
          {errors.submit ? (
            <View style={styles.errorBanner} testID="form-error-banner">
              <Text style={styles.errorBannerText}>{errors.submit}</Text>
            </View>
          ) : null}

          {/* FIR / Case Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Case / FIR Number *</Text>
            <TextInput
              style={[styles.input, errors.case_number ? styles.inputError : null]}
              placeholder="e.g. FIR-102/2026 or CR-84/2026"
              placeholderTextColor="#64748b"
              value={form.caseNumber}
              onChangeText={(val: string) => updateField('caseNumber', val)}
              testID="input-case-number"
            />
            {errors.case_number ? (
              <Text style={styles.errorText}>{errors.case_number}</Text>
            ) : null}
          </View>

          {/* Examiner Info */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfCol]}>
              <Text style={styles.label}>Examiner Name *</Text>
              <TextInput
                style={[styles.input, errors.examiner_name ? styles.inputError : null]}
                placeholder="e.g. Insp. Rajesh Sharma"
                placeholderTextColor="#64748b"
                value={form.examinerName}
                onChangeText={(val: string) => updateField('examinerName', val)}
                testID="input-examiner-name"
              />
              {errors.examiner_name ? (
                <Text style={styles.errorText}>{errors.examiner_name}</Text>
              ) : null}
            </View>

            <View style={[styles.fieldGroup, styles.halfCol]}>
              <Text style={styles.label}>Examiner Designation *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors.examiner_designation ? styles.inputError : null,
                ]}
                placeholder="e.g. Forensic Analyst"
                placeholderTextColor="#64748b"
                value={form.examinerDesignation}
                onChangeText={(val: string) => updateField('examinerDesignation', val)}
                testID="input-examiner-designation"
              />
              {errors.examiner_designation ? (
                <Text style={styles.errorText}>{errors.examiner_designation}</Text>
              ) : null}
            </View>
          </View>

          {/* Accused & Agency */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfCol]}>
              <Text style={styles.label}>Accused Name / Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Suresh Patel (or Unknown)"
                placeholderTextColor="#64748b"
                value={form.accusedName}
                onChangeText={(val: string) => updateField('accusedName', val)}
                testID="input-accused-name"
              />
            </View>

            <View style={[styles.fieldGroup, styles.halfCol]}>
              <Text style={styles.label}>Investigating Agency *</Text>
              <TextInput
                style={[styles.input, errors.agency ? styles.inputError : null]}
                placeholder="e.g. Cyber Cell, Special Branch"
                placeholderTextColor="#64748b"
                value={form.agency}
                onChangeText={(val: string) => updateField('agency', val)}
                testID="input-agency"
              />
              {errors.agency ? (
                <Text style={styles.errorText}>{errors.agency}</Text>
              ) : null}
            </View>
          </View>

          {/* Device & Destination */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, styles.halfCol]}>
              <Text style={styles.label}>Device Type *</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    form.deviceType === 'desktop' && styles.typeBtnActive,
                  ]}
                  onPress={() => updateField('deviceType', 'desktop')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.deviceType === 'desktop' && styles.typeBtnTextActive,
                    ]}
                  >
                    Desktop (macOS)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    form.deviceType === 'android' && styles.typeBtnActive,
                  ]}
                  onPress={() => updateField('deviceType', 'android')}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      form.deviceType === 'android' && styles.typeBtnTextActive,
                    ]}
                  >
                    Android
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.fieldGroup, styles.halfCol]}>
              <Text style={styles.label}>Device Identifier *</Text>
              <TextInput
                style={[
                  styles.input,
                  errors['device.name'] ? styles.inputError : null,
                ]}
                placeholder="e.g. Lab Machine #04"
                placeholderTextColor="#64748b"
                value={form.deviceName}
                onChangeText={(val: string) => updateField('deviceName', val)}
                testID="input-device-name"
              />
              {errors['device.name'] ? (
                <Text style={styles.errorText}>{errors['device.name']}</Text>
              ) : null}
            </View>
          </View>

          {/* Storage Directory */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Case Storage Directory</Text>
            <TextInput
              style={styles.input}
              value={basePath}
              onChangeText={setBasePath}
              placeholder="/tmp/smp_cases"
              placeholderTextColor="#64748b"
              testID="input-base-path"
            />
          </View>

          {/* Remarks */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Remarks / Incident Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={3}
              placeholder="e.g. Evidence seized for Section 65B certification..."
              placeholderTextColor="#64748b"
              value={form.remarks}
              onChangeText={(val: string) => updateField('remarks', val)}
              testID="input-remarks"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleCreateCase}
            disabled={loading}
            testID="btn-create-case-submit"
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.submitButtonText}>Create Case Folder & Metadata</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    backgroundColor: '#0f172a',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfCol: {
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0369a1',
  },
  typeBtnText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  typeBtnTextActive: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#38bdf8',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  successBanner: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 24,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34d399',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f8fafc',
    marginBottom: 4,
  },
  successSubtext: {
    fontSize: 13,
    color: '#a7f3d0',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
  },
  proceedButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  proceedButtonText: {
    color: '#064e3b',
    fontWeight: '700',
    fontSize: 13,
  },
  newAnotherButton: {
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  newAnotherButtonText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
});
