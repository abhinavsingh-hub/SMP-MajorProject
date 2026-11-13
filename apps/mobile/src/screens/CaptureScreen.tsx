import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CaptureScreenProps } from '../navigation/types';
import { ScreenCapture } from '../native/ScreenCapture';
import { Accessibility, useAccessibilityStatus } from '../native/Accessibility';

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ route }) => {
  const { platform, caseNumber, examinerName, accusedName } = route.params;

  const isAccessibilityEnabled = useAccessibilityStatus();

  // Screen Capture States
  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [savedFilePath, setSavedFilePath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Automation Test States
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);

  const handleTestCapture = async () => {
    try {
      setIsCapturing(true);
      setErrorMessage('');
      setStatusMessage('Requesting MediaProjection consent...');

      await ScreenCapture.requestPermission();

      setStatusMessage('Capturing screen frame via ImageReader...');
      const filesDir = await ScreenCapture.getFilesDir();
      const targetPath = `${filesDir}/evidence_${Date.now()}.png`;

      const resultPath = await ScreenCapture.captureScreenshot(targetPath);
      setSavedFilePath(resultPath);
      setStatusMessage('Screenshot captured and saved to files directory.');
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(errStr);
      setStatusMessage('');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Accessibility.openSettings();
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(errStr);
    }
  };

  const handleTestAutomation = async () => {
    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(msg);
      setAutomationLogs([...logs]);
    };

    try {
      setIsAutomating(true);
      setAutomationLogs([]);

      // Step 1: Launch Settings app
      addLog('Step 1: Launching com.android.settings...');
      const launched = await Accessibility.launchApp('com.android.settings');
      addLog(`Step 1 Result: ${launched ? 'Launched successfully' : 'Failed to launch'}`);

      // Step 2: Wait for 'Network'
      addLog("Step 2: Waiting for text 'Network' (timeout 5s)...");
      const foundText = await Accessibility.waitForText('Network', 5000);
      addLog(`Step 2 Result: Text 'Network' ${foundText ? 'found' : 'not found'}`);

      // Step 3: Scroll forward 3 times
      for (let i = 1; i <= 3; i++) {
        addLog(`Step 3.${i}: Scrolling forward (${i}/3)...`);
        const scrolled = await Accessibility.scrollForward();
        addLog(`Step 3.${i} Result: ${scrolled ? 'Scrolled' : 'Reached end / Not scrollable'}`);
      }

      // Step 4: Perform Back
      addLog('Step 4: Performing global BACK action...');
      const backed = await Accessibility.performBack();
      addLog(`Step 4 Result: ${backed ? 'Back executed' : 'Back failed'}`);

      addLog('Automation sequence completed.');
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      addLog(`Automation Error: ${errStr}`);
    } finally {
      setIsAutomating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{platform.toUpperCase()} EVIDENCE CAPTURE</Text>
          </View>

          <Text style={styles.title}>Forensic Capture Session</Text>
          <Text style={styles.subtitle}>
            Active case context initialized for evidentiary preservation.
          </Text>

          {/* Accessibility Service Status */}
          <View style={styles.accessibilityCard}>
            <View style={styles.accessibilityInfo}>
              <Text style={styles.accessibilityLabel}>Accessibility:</Text>
              <View
                style={[
                  styles.statusBadge,
                  isAccessibilityEnabled ? styles.statusBadgeEnabled : styles.statusBadgeDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isAccessibilityEnabled
                      ? styles.statusBadgeTextEnabled
                      : styles.statusBadgeTextDisabled,
                  ]}
                >
                  {isAccessibilityEnabled ? 'enabled' : 'disabled'}
                </Text>
              </View>
            </View>
            {!isAccessibilityEnabled ? (
              <Pressable
                style={({ pressed }) => [
                  styles.enableButton,
                  pressed && styles.enableButtonPressed,
                ]}
                onPress={handleOpenSettings}
              >
                <Text style={styles.enableButtonText}>Enable</Text>
              </Pressable>
            ) : null}
          </View>

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

          {/* Screenshot Test Section */}
          <View style={styles.actionSection}>
            <Pressable
              style={({ pressed }) => [
                styles.captureButton,
                pressed && styles.captureButtonPressed,
                isCapturing && styles.buttonDisabled,
              ]}
              onPress={handleTestCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Test MediaProjection Capture</Text>
              )}
            </Pressable>

            {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
            {errorMessage ? <Text style={styles.errorText}>Error: {errorMessage}</Text> : null}

            {savedFilePath ? (
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>Saved Screenshot Path:</Text>
                <Text style={styles.resultPath} numberOfLines={3} selectable>
                  {savedFilePath}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Accessibility Automation Test Section */}
          <View style={styles.automationSection}>
            <Pressable
              style={({ pressed }) => [
                styles.automationButton,
                pressed && styles.automationButtonPressed,
                (!isAccessibilityEnabled || isAutomating) && styles.buttonDisabled,
              ]}
              onPress={handleTestAutomation}
              disabled={!isAccessibilityEnabled || isAutomating}
            >
              {isAutomating ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  Test Settings Automation Flow (Settings → Network → Scroll x3 → Back)
                </Text>
              )}
            </Pressable>

            {automationLogs.length > 0 ? (
              <View style={styles.logContainer}>
                <Text style={styles.logTitle}>Automation Step Execution:</Text>
                {automationLogs.map((log, index) => (
                  <Text key={index} style={styles.logItem}>
                    • {log}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
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
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    maxWidth: 420,
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
  accessibilityCard: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b70',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  accessibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessibilityLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeEnabled: {
    backgroundColor: '#05966925',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  statusBadgeDisabled: {
    backgroundColor: '#dc262625',
    borderColor: '#f87171',
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadgeTextEnabled: {
    color: '#34d399',
  },
  statusBadgeTextDisabled: {
    color: '#f87171',
  },
  enableButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  enableButtonPressed: {
    backgroundColor: '#0369a1',
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
  actionSection: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  automationSection: {
    width: '100%',
    marginTop: 16,
    gap: 10,
  },
  captureButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureButtonPressed: {
    backgroundColor: '#0369a1',
  },
  automationButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  automationButtonPressed: {
    backgroundColor: '#115e59',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 13,
    color: '#38bdf8',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
  },
  resultBox: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  resultPath: {
    fontSize: 12,
    color: '#a7f3d0',
    fontFamily: 'monospace',
  },
  logContainer: {
    backgroundColor: '#1e293b90',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 4,
  },
  logItem: {
    fontSize: 12,
    color: '#cbd5e1',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
