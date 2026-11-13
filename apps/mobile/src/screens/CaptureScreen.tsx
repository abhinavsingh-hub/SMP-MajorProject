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

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ route }) => {
  const { platform, caseNumber, examinerName, accusedName } = route.params;

  const [isCapturing, setIsCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [savedFilePath, setSavedFilePath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

          <View style={styles.actionSection}>
            <Pressable
              style={({ pressed }) => [
                styles.captureButton,
                pressed && styles.captureButtonPressed,
                isCapturing && styles.captureButtonDisabled,
              ]}
              onPress={handleTestCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.captureButtonText}>Test MediaProjection Capture</Text>
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
    marginTop: 24,
    gap: 12,
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
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
});
