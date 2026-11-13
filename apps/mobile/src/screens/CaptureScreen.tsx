import React, { useRef, useState } from 'react';
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
import { ScriptRunner } from '../runner/ScriptRunner';
import { demoScript } from '../runner/demoScript';
import type { LogEntry } from '../runner/types';

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ route }) => {
  const { platform, caseNumber, examinerName, accusedName } = route.params;

  const isAccessibilityEnabled = useAccessibilityStatus();

  // Screen Capture States
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('');
  const [savedFilePath, setSavedFilePath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Script Runner States
  const [runnerState, setRunnerState] = useState<
    'idle' | 'running' | 'paused' | 'stopped' | 'done' | 'error'
  >('idle');
  const [progressInfo, setProgressInfo] = useState({ current: 0, total: 0 });
  const [runnerLogs, setRunnerLogs] = useState<LogEntry[]>([]);
  const runnerRef = useRef<ScriptRunner | null>(null);

  const handleTestCapture = async () => {
    try {
      setIsCapturing(true);
      setErrorMessage('');
      setCaptureStatus('Requesting MediaProjection consent...');

      await ScreenCapture.requestPermission();

      setCaptureStatus('Capturing screen frame via ImageReader...');
      const filesDir = await ScreenCapture.getFilesDir();
      const targetPath = `${filesDir}/evidence_${Date.now()}.png`;

      const resultPath = await ScreenCapture.captureScreenshot(targetPath);
      setSavedFilePath(resultPath);
      setCaptureStatus('Screenshot captured and saved to files directory.');
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(errStr);
      setCaptureStatus('');
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

  const handleStartDemoScript = async () => {
    try {
      setErrorMessage('');
      setRunnerLogs([]);
      setProgressInfo({ current: 0, total: demoScript.length });
      setRunnerState('running');

      const filesDir = (await ScreenCapture.getFilesDir()) || '/data/user/0/com.socialparse.mobile/files';
      const caseDir = `${filesDir}/${caseNumber}`;

      const runner = new ScriptRunner({
        caseDir,
        platform,
      });
      runnerRef.current = runner;

      runner.on('progress', (index, total) => {
        setProgressInfo({ current: index, total });
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('stepStart', () => {
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('stepSuccess', () => {
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('stepFailed', () => {
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('capture', (_section, path) => {
        setSavedFilePath(path);
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('paused', () => {
        setRunnerState('paused');
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('resumed', () => {
        setRunnerState('running');
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('stopped', () => {
        setRunnerState('stopped');
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('done', () => {
        setRunnerState('done');
        setRunnerLogs([...runner.getLog()]);
      });

      runner.on('error', (err) => {
        setRunnerState('error');
        setErrorMessage(err.message);
        setRunnerLogs([...runner.getLog()]);
      });

      await runner.run(demoScript);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(errStr);
      setRunnerState('error');
    }
  };

  const handlePauseResume = () => {
    if (!runnerRef.current) return;
    if (runnerState === 'running') {
      runnerRef.current.pause();
    } else if (runnerState === 'paused') {
      runnerRef.current.resume();
    }
  };

  const handleStop = () => {
    if (!runnerRef.current) return;
    runnerRef.current.stop();
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

          {/* Case Metadata Details */}
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

          {/* ScriptRunner Demo Control Section */}
          <View style={styles.runnerControlSection}>
            <Text style={styles.sectionTitle}>Automated Capture Pipeline (ScriptRunner)</Text>
            {runnerState !== 'idle' ? (
              <Text style={styles.runnerStatusText}>
                Status:{' '}
                <Text style={styles.boldStatus}>
                  {runnerState.toUpperCase()}
                  {progressInfo.total > 0
                    ? ` (Step ${progressInfo.current}/${progressInfo.total})`
                    : ''}
                </Text>
              </Text>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.runButton,
                  pressed && styles.runButtonPressed,
                  (runnerState === 'running' || runnerState === 'paused') && styles.buttonDisabled,
                ]}
                onPress={handleStartDemoScript}
                disabled={runnerState === 'running' || runnerState === 'paused'}
              >
                {runnerState === 'running' ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Run Demo Script</Text>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.controlButton,
                  styles.pauseButton,
                  pressed && styles.controlButtonPressed,
                  (runnerState !== 'running' && runnerState !== 'paused') && styles.buttonDisabled,
                ]}
                onPress={handlePauseResume}
                disabled={runnerState !== 'running' && runnerState !== 'paused'}
              >
                <Text style={styles.buttonText}>
                  {runnerState === 'paused' ? 'Resume' : 'Pause'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.controlButton,
                  styles.stopButton,
                  pressed && styles.controlButtonPressed,
                  (runnerState !== 'running' && runnerState !== 'paused') && styles.buttonDisabled,
                ]}
                onPress={handleStop}
                disabled={runnerState !== 'running' && runnerState !== 'paused'}
              >
                <Text style={styles.buttonText}>Stop</Text>
              </Pressable>
            </View>

            {/* Live ScriptRunner Log Stream */}
            {runnerLogs.length > 0 ? (
              <View style={styles.logContainer}>
                <Text style={styles.logHeader}>Live Runner Events ({runnerLogs.length}):</Text>
                <ScrollView nestedScrollEnabled style={styles.logScrollView}>
                  {runnerLogs.map((log, idx) => (
                    <View key={idx} style={styles.logLine}>
                      <Text style={styles.logTimestamp}>{log.timestamp.slice(11, 19)}</Text>
                      <Text style={styles.logEvent}>[{log.event}]</Text>
                      <Text style={styles.logMessage}>
                        {log.label ? `${log.label} ` : ''}
                        {log.details ? JSON.stringify(log.details) : ''}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

          {/* Standalone One-Shot Screenshot Test */}
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
                <Text style={styles.buttonText}>Test One-Shot Capture</Text>
              )}
            </Pressable>

            {captureStatus ? <Text style={styles.statusText}>{captureStatus}</Text> : null}
            {errorMessage ? <Text style={styles.errorText}>Error: {errorMessage}</Text> : null}

            {savedFilePath ? (
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>Last Captured PNG:</Text>
                <Text style={styles.resultPath} numberOfLines={2} selectable>
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
    padding: 16,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#0369a130',
    borderWidth: 1,
    borderColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 14,
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
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
    paddingVertical: 10,
    marginBottom: 14,
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
    fontSize: 11,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
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
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  runnerControlSection: {
    width: '100%',
    marginTop: 18,
    backgroundColor: '#1e293b40',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  runnerStatusText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  boldStatus: {
    fontWeight: '700',
    color: '#e2e8f0',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  runButton: {
    flex: 2,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runButtonPressed: {
    backgroundColor: '#0369a1',
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    backgroundColor: '#d97706',
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  controlButtonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  logContainer: {
    backgroundColor: '#090d16',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: 180,
  },
  logHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
  },
  logScrollView: {
    maxHeight: 140,
  },
  logLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 3,
  },
  logTimestamp: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  logEvent: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 10,
    color: '#cbd5e1',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  actionSection: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  captureButton: {
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureButtonPressed: {
    backgroundColor: '#115e59',
  },
  statusText: {
    fontSize: 12,
    color: '#38bdf8',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
  },
  resultBox: {
    backgroundColor: '#1e293b',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 2,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  resultPath: {
    fontSize: 11,
    color: '#a7f3d0',
    fontFamily: 'monospace',
  },
});
