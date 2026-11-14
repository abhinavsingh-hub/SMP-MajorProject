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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbItem}>FORENSIC WORKSPACE</Text>
          <Text style={styles.breadcrumbDivider}>/</Text>
          <Text style={styles.breadcrumbActive}>CASE REGISTRATION</Text>
        </View>
        <Text style={styles.title}>Register Forensic Case</Text>
        <Text style={styles.subtitle}>
          Provisions a tamper-evident case folder with genesis audit event, empty manifest, and Section 65B metadata.
        </Text>
      </View>

      {/* Success Banner */}
      {successInfo && (
        <View style={styles.successBanner} testID="case-success-banner">
          <View style={styles.successTopRow}>
            <View style={styles.successIconBadge}>
              <Text style={styles.successIcon}>✓</Text>
            </View>
            <View style={styles.successTextGroup}>
              <Text style={styles.successTitle}>Case Repository Initialized</Text>
              <Text style={styles.successCaseId}>Case ID: {successInfo.caseId}</Text>
              <Text style={styles.successSubtext}>Path: {successInfo.folderPath}</Text>
            </View>
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => onNavigate && onNavigate('capture')}
              testID="btn-proceed-capture"
            >
              <Text style={styles.proceedButtonText}>Proceed to Evidence Capture →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error Banner */}
      {errors.submit && (
        <View style={styles.errorBanner} testID="form-error-banner">
          <Text style={styles.errorBannerTitle}>Case Creation Failed</Text>
          <Text style={styles.errorBannerText}>{errors.submit}</Text>
        </View>
      )}

      {/* Form Container */}
      <View style={styles.formCard}>
        {/* Section 1: Legal Case Information */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Legal Case & FIR Particulars</Text>
            <Text style={styles.sectionSubtitle}>
              Official police station FIR or complaint reference for court admissibility
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>
                Case / FIR Number <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.case_number ? styles.inputError : null]}
                value={form.caseNumber}
                onChangeText={(text: string) => updateField('caseNumber', text)}
                placeholder="e.g. FIR-102/2026, Crime Branch"
                placeholderTextColor="#A09E99"
                testID="input-case-number"
              />
              {errors.case_number && <Text style={styles.errorText}>{errors.case_number}</Text>}
            </View>

            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>Accused / Subject Name</Text>
              <TextInput
                style={styles.input}
                value={form.accusedName}
                onChangeText={(text: string) => updateField('accusedName', text)}
                placeholder="e.g. Suresh Patel (or Unknown / Under Investigation)"
                placeholderTextColor="#A09E99"
                testID="input-accused-name"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Investigating Agency / Police Station <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.agency ? styles.inputError : null]}
              value={form.agency}
              onChangeText={(text: string) => updateField('agency', text)}
              placeholder="e.g. Cyber Crime Investigation Cell, State Police"
              placeholderTextColor="#A09E99"
              testID="input-agency"
            />
            {errors.agency && <Text style={styles.errorText}>{errors.agency}</Text>}
          </View>
        </View>

        {/* Section 2: Investigating Examiner */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Investigating Forensic Examiner</Text>
            <Text style={styles.sectionSubtitle}>
              Authorised officer operating the seizure equipment under Section 65B(2)
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>
                Examiner Full Name <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.examiner_name ? styles.inputError : null]}
                value={form.examinerName}
                onChangeText={(text: string) => updateField('examinerName', text)}
                placeholder="e.g. Insp. Rajesh Sharma"
                placeholderTextColor="#A09E99"
                testID="input-examiner-name"
              />
              {errors.examiner_name && <Text style={styles.errorText}>{errors.examiner_name}</Text>}
            </View>

            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>Designation / Rank</Text>
              <TextInput
                style={styles.input}
                value={form.examinerDesignation}
                onChangeText={(text: string) => updateField('examinerDesignation', text)}
                placeholder="e.g. Cyber Forensics Officer / Sub-Inspector"
                placeholderTextColor="#A09E99"
                testID="input-examiner-designation"
              />
            </View>
          </View>
        </View>

        {/* Section 3: Hardware & Forensic Storage */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>3. Seizure Hardware & Storage Directory</Text>
            <Text style={styles.sectionSubtitle}>
              Hardware environment recorded into case.json and audit log
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>Device Platform</Text>
              <View style={styles.deviceTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.deviceOption,
                    form.deviceType === 'desktop' && styles.deviceOptionActive,
                  ]}
                  onPress={() => updateField('deviceType', 'desktop')}
                >
                  <Text
                    style={[
                      styles.deviceOptionText,
                      form.deviceType === 'desktop' && styles.deviceOptionTextActive,
                    ]}
                  >
                    Desktop (macOS / Linux)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deviceOption,
                    form.deviceType === 'android' && styles.deviceOptionActive,
                  ]}
                  onPress={() => updateField('deviceType', 'android')}
                >
                  <Text
                    style={[
                      styles.deviceOptionText,
                      form.deviceType === 'android' && styles.deviceOptionTextActive,
                    ]}
                  >
                    Android Mobile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroupFlex}>
              <Text style={styles.label}>
                Device Name / Identifier <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors['device.name'] ? styles.inputError : null]}
                value={form.deviceName}
                onChangeText={(text: string) => updateField('deviceName', text)}
                placeholder="e.g. Workstation-01 (macOS 14.5)"
                placeholderTextColor="#A09E99"
                testID="input-device-name"
              />
              {errors['device.name'] && (
                <Text style={styles.errorText}>{errors['device.name']}</Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Case Storage Root Path</Text>
            <TextInput
              style={[styles.input, styles.monospaceInput]}
              value={basePath}
              onChangeText={(text: string) => setBasePath(text)}
              placeholder="/tmp/smp_cases"
              placeholderTextColor="#A09E99"
              testID="input-base-path"
            />
          </View>
        </View>

        {/* Section 4: Legal Remarks */}
        <View style={styles.formSectionLast}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>4. Legal Authority & Seizure Memo</Text>
            <Text style={styles.sectionSubtitle}>
              Mandated Panchnama remarks included in final Section 65B certification
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Remarks & Authority</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.remarks}
              onChangeText={(text: string) => updateField('remarks', text)}
              multiline
              numberOfLines={3}
              placeholder="Forensic seizure conducted pursuant to Section 65B of the Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam."
              placeholderTextColor="#A09E99"
              testID="input-remarks"
            />
          </View>
        </View>

        {/* Submit Action */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, loading ? styles.submitButtonDisabled : null]}
            onPress={handleCreateCase}
            disabled={loading}
            testID="btn-create-case-submit"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Case Repository & Provision Metadata</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    backgroundColor: '#F8F8F6',
  },
  header: {
    marginBottom: 28,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  breadcrumbItem: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8C8B88',
    letterSpacing: 0.6,
  },
  breadcrumbDivider: {
    fontSize: 10,
    color: '#B0AFA9',
  },
  breadcrumbActive: {
    fontSize: 10,
    fontWeight: '600',
    color: '#34445B',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#242522',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666562',
    lineHeight: 18,
  },
  successBanner: {
    backgroundColor: '#EBF4EF',
    borderWidth: 1,
    borderColor: '#CCE3D6',
    borderRadius: 8,
    padding: 18,
    marginBottom: 24,
  },
  successTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  successIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2E6B4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  successTextGroup: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E6B4E',
    marginBottom: 2,
  },
  successCaseId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#242522',
  },
  successSubtext: {
    fontSize: 11,
    color: '#666562',
    marginTop: 2,
  },
  successActions: {
    borderTopWidth: 1,
    borderTopColor: '#D8ECE0',
    paddingTop: 12,
  },
  proceedButton: {
    backgroundColor: '#34445B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FDF0EF',
    borderWidth: 1,
    borderColor: '#F4D3D1',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9E3834',
    marginBottom: 2,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#9E3834',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 8,
    padding: 24,
    marginBottom: 32,
  },
  formSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFEA',
    paddingBottom: 20,
    marginBottom: 20,
  },
  formSectionLast: {
    paddingBottom: 10,
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#242522',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#7A7875',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputGroupFlex: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#242522',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#9E3834',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCDAD5',
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#242522',
  },
  inputError: {
    borderColor: '#9E3834',
    backgroundColor: '#FFF9F9',
  },
  monospaceInput: {
    fontSize: 12,
    color: '#34445B',
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    color: '#9E3834',
    marginTop: 4,
  },
  deviceTypeSelector: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DCDAD5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  deviceOption: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: '#F8F8F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceOptionActive: {
    backgroundColor: '#34445B',
  },
  deviceOptionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666562',
  },
  deviceOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitSection: {
    paddingTop: 10,
  },
  submitButton: {
    backgroundColor: '#34445B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
