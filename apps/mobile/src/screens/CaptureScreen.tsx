import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';
import type { CaseVerificationResult } from '@socialparse/core';
import type { CaptureScreenProps } from '../navigation/types';
import { Accessibility, useAccessibilityStatus } from '../native/Accessibility';
import { ScreenCapture } from '../native/ScreenCapture';
import { EvidenceService } from '../evidence/EvidenceService';
import { ScriptRunner } from '../runner/ScriptRunner';
import { useScriptRunner } from '../runner/useScriptRunner';
import { getScriptForPlatform, isPlatformSupported } from '../scripts';
import { ProgressBar } from '../components/ProgressBar';
import { CounterBadge } from '../components/CounterBadge';
import { EventRow } from '../components/EventRow';
import { exportCase, type ExportCaseResult } from '../export/exportCase';
import { shareCase } from '../export/shareCase';
import { generateReport, type GenerateReportResult } from '../report/generateReport';
import Share from 'react-native-share';

export const CaptureScreen: React.FC<CaptureScreenProps> = ({ route, navigation }) => {
  const { platform, caseNumber, examinerName, accusedName, caseDir } = route.params;
  const isAccessibilityEnabled = useAccessibilityStatus();
  const evidenceService = useMemo(() => new EvidenceService(caseDir, platform), [caseDir, platform]);
  const isSupported = isPlatformSupported(platform);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<CaseVerificationResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<Extract<ExportCaseResult, { verified: true }> | null>(null);
  const [exportError, setExportError] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<GenerateReportResult | null>(null);
  const [reportError, setReportError] = useState('');
  const allowLeaveRef = useRef(false);

  const runner = useMemo(
    () => new ScriptRunner({
      caseDir,
      platform,
      onCapture: (path, section, source, capturedAt) =>
        evidenceService.onCapture(path, section, source, capturedAt).then(() => undefined),
      onCaptureBlocked: (path, section) => evidenceService.recordCaptureBlocked(section, path),
    }),
    [caseDir, platform, evidenceService],
  );
  const view = useScriptRunner(runner);
  const active = view.status === 'running' || view.status === 'paused';
  const statusStyle = {
    idle: styles.status_idle,
    running: styles.status_running,
    paused: styles.status_paused,
    stopped: styles.status_stopped,
    done: styles.status_done,
    error: styles.status_error,
  }[view.status];

  useEffect(() => {
    if (!active) return undefined;
    activateKeepAwake();
    return () => deactivateKeepAwake();
  }, [active]);

  useEffect(() => {
    const subscriptions = [
      runner.on('paused', () => { void evidenceService.recordPaused(); }),
      runner.on('stopped', () => { void evidenceService.recordStopped(); }),
      runner.on('done', () => { void evidenceService.recordDone(); }),
      runner.on('stepFailed', (step, _index, error) => {
        void evidenceService.recordStepFailed(step.label ?? step.kind, error.message);
      }),
      runner.on('error', (error) => {
        setErrorMessage(error.message);
        void evidenceService.recordStepFailed('pipeline_error', error.message);
      }),
    ];
    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, [runner, evidenceService]);

  const confirmLeave = useCallback((onLeave: () => void) => {
    Alert.alert('Capture in progress', 'Leaving will stop the current capture run.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Stop and leave',
        style: 'destructive',
        onPress: () => {
          allowLeaveRef.current = true;
          runner.stop();
          onLeave();
        },
      },
    ]);
  }, [runner]);

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (!active || allowLeaveRef.current) return;
    event.preventDefault();
    confirmLeave(() => navigation.dispatch(event.data.action));
  }), [active, confirmLeave, navigation]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!active) return false;
      confirmLeave(() => navigation.goBack());
      return true;
    });
    return () => subscription.remove();
  }, [active, confirmLeave, navigation]);

  const handleStart = async () => {
    try {
      if (!isSupported) throw new Error(`Automated script is not configured for ${platform}`);
      if (!isAccessibilityEnabled) return;
      setErrorMessage('');
      const permissionGranted = await ScreenCapture.requestPermission();
      if (!permissionGranted) return;
      await runner.run(getScriptForPlatform(platform, { maxChats: 3, maxPosts: 3, scrollsPerSection: 2 }));
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handlePauseResume = () => {
    if (view.status === 'running') runner.pause();
    else if (view.status === 'paused') runner.resume();
  };

  const handleVerify = async () => {
    try {
      setIsVerifying(true);
      setErrorMessage('');
      setVerificationResult(await evidenceService.verifyCaseIntegrity());
    } catch (error: unknown) {
      setErrorMessage(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportError('');
      setExportResult(null);
      const result = await exportCase(caseDir);
      if (!result.verified) {
        setExportError(`Export stopped because case verification failed:\n${result.mismatches.join('\n')}`);
        return;
      }
      setExportResult(result);
    } catch (error: unknown) {
      setExportError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareExport = async () => {
    if (!exportResult) return;
    try {
      await shareCase(exportResult.zipPath);
    } catch (error: unknown) {
      setExportError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopyHash = () => {
    if (!exportResult) return;
    Clipboard.setString(exportResult.sha256);
    Alert.alert('Hash copied', 'The ZIP SHA-256 was copied to the clipboard.');
  };

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      setReportError('');
      setReportResult(null);
      setReportResult(await generateReport(caseDir));
    } catch (error: unknown) {
      setReportError(`Report generation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleReportAction = async (share: boolean) => {
    if (!reportResult) return;
    try {
      await Share.open({
        title: share ? 'Share PDF report' : 'Open PDF report',
        url: `file://${reportResult.pdfPath}`,
        type: 'application/pdf',
        failOnCancel: false,
      });
    } catch (error: unknown) {
      setReportError(error instanceof Error ? error.message : String(error));
    }
  };

  const isDone = view.status === 'done';
  const canExport = isDone || view.status === 'stopped';
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.platformMark}><Text style={styles.platformMarkText}>{platform.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>EVIDENCE CAPTURE</Text>
            <Text style={styles.title}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</Text>
            <Text style={styles.caseNumber}>Case {caseNumber}</Text>
          </View>
          <View style={[styles.statusPill, statusStyle]}>
            <Text style={styles.statusText}>{view.status.toUpperCase()}</Text>
          </View>
        </View>

        {!isAccessibilityEnabled ? (
          <View style={styles.accessibilityBanner}>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Accessibility service is off</Text>
              <Text style={styles.bannerText}>Enable it to let the capture script navigate the app.</Text>
            </View>
            <Pressable style={styles.enableButton} onPress={() => void Accessibility.openSettings()}>
              <Text style={styles.enableText}>Enable</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Run progress</Text>
          <ProgressBar index={view.progress.index} total={view.progress.total} label={view.currentLabel} />
          <View style={styles.counters}>
            <CounterBadge label="Captured" count={view.captureCount} color="#38bdf8" />
            <CounterBadge label="Failed" count={view.failedCount} color="#fb7185" />
            <CounterBadge label="Blocked" count={view.blockedCount} color="#fbbf24" />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Latest screenshot</Text>
            {view.lastScreenshotPath ? <Text style={styles.smallMuted}>Evidence file saved</Text> : null}
          </View>
          {view.lastScreenshotPath ? (
            <Image source={{ uri: `file://${view.lastScreenshotPath}` }} style={styles.preview} resizeMode="contain" />
          ) : (
            <View style={styles.previewEmpty}><Text style={styles.emptyText}>A capture preview will appear here.</Text></View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.smallMuted}>{view.recentEvents.length} / 50</Text>
          </View>
          {view.recentEvents.length ? view.recentEvents.map((event) => <EventRow key={event.id} event={event} />) : (
            <Text style={styles.emptyText}>Capture events will appear here.</Text>
          )}
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {verificationResult ? (
          <View style={[styles.verification, verificationResult.passed ? styles.passed : styles.failed]}>
            <Text style={styles.verificationText}>
              {verificationResult.passed
                ? `Integrity verified · ${verificationResult.itemsChecked} items`
                : `Verification found ${verificationResult.issues.length} issue(s)`}
            </Text>
          </View>
        ) : null}

        {exportError ? (
          <View style={[styles.verification, styles.failed]}>
            <Text style={styles.verificationText}>{exportError}</Text>
          </View>
        ) : null}

        {reportError ? <View style={[styles.verification, styles.failed]}><Text style={styles.verificationText}>{reportError}</Text></View> : null}
        {reportResult ? (
          <View style={styles.exportCard}>
            <Text style={styles.sectionTitle}>PDF report ready{reportResult.pageCount ? ` · ${reportResult.pageCount} pages` : ''}</Text>
            <Text style={styles.exportLabel}>PDF path</Text>
            <Text style={styles.exportPath} selectable>{reportResult.pdfPath}</Text>
            <Text style={styles.exportLabel}>SHA-256</Text>
            <Text style={styles.hash} selectable>{reportResult.sha256}</Text>
            <View style={styles.exportButtons}>
              <Pressable style={styles.primaryButton} onPress={() => void handleReportAction(false)}><Text style={styles.primaryButtonText}>Open</Text></Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => void handleReportAction(true)}><Text style={styles.secondaryText}>Share</Text></Pressable>
            </View>
          </View>
        ) : null}

        {exportResult ? (
          <View style={styles.exportCard}>
            <Text style={styles.sectionTitle}>Case archive ready</Text>
            <Text style={styles.exportLabel}>ZIP path</Text>
            <Text style={styles.exportPath} selectable>{exportResult.zipPath}</Text>
            <Text style={styles.exportLabel}>SHA-256</Text>
            <Text style={styles.hash} selectable>{exportResult.sha256}</Text>
            <View style={styles.exportButtons}>
              <Pressable style={styles.primaryButton} onPress={() => void handleShareExport()}>
                <Text style={styles.primaryButtonText}>Share</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleCopyHash}>
                <Text style={styles.secondaryText}>Copy hash</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.controls}>
          {view.status === 'idle' ? (
            <Pressable
              style={[styles.primaryButton, (!isAccessibilityEnabled || !isSupported) && styles.disabled]}
              onPress={handleStart}
              disabled={!isAccessibilityEnabled || !isSupported}
            >
              <Text style={styles.primaryButtonText}>{isSupported ? 'Start capture' : 'Platform unsupported'}</Text>
            </Pressable>
          ) : null}
          {view.status === 'running' || view.status === 'paused' ? (
            <>
              <Pressable style={styles.secondaryButton} onPress={handlePauseResume}>
                <Text style={styles.secondaryText}>{view.status === 'paused' ? 'Resume' : 'Pause'}</Text>
              </Pressable>
              <Pressable style={styles.stopButton} onPress={() => Alert.alert('Stop capture?', 'The current run will be stopped.', [
                { text: 'Continue capture', style: 'cancel' },
                { text: 'Stop', style: 'destructive', onPress: () => runner.stop() },
              ])}>
                <Text style={styles.primaryButtonText}>Stop</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable style={[styles.secondaryButton, !isDone && styles.disabled]} disabled={!isDone || isVerifying} onPress={handleVerify}>
            <Text style={styles.secondaryText}>{isVerifying ? 'Verifying…' : 'Verify case'}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, (!canExport || isExporting) && styles.disabled]} disabled={!canExport || isExporting} onPress={() => void handleExport()}>
            {isExporting ? <ActivityIndicator color="#e2e8f0" /> : <Text style={styles.secondaryText}>Export</Text>}
          </Pressable>
          <Pressable style={[styles.secondaryButton, (!canExport || isGeneratingReport) && styles.disabled]} disabled={!canExport || isGeneratingReport} onPress={() => void handleGenerateReport()}>
            {isGeneratingReport ? <ActivityIndicator color="#e2e8f0" /> : <Text style={styles.secondaryText}>Generate report</Text>}
          </Pressable>
        </View>

        <Text style={styles.examinerNote}>{examinerName} · Subject: {accusedName}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080d17' },
  content: { padding: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  platformMark: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c4a6e' },
  platformMarkText: { color: '#7dd3fc', fontSize: 22, fontWeight: '800' },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { color: '#38bdf8', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  caseNumber: { color: '#94a3b8', fontSize: 12 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1e293b' },
  statusText: { color: '#cbd5e1', fontSize: 9, fontWeight: '800' },
  status_running: { backgroundColor: '#075985' },
  status_paused: { backgroundColor: '#854d0e' },
  status_stopped: { backgroundColor: '#7f1d1d' },
  status_done: { backgroundColor: '#065f46' },
  status_error: { backgroundColor: '#7f1d1d' },
  status_idle: { backgroundColor: '#1e293b' },
  accessibilityBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#451a03', borderRadius: 12, borderWidth: 1, borderColor: '#92400e' },
  bannerCopy: { flex: 1, gap: 4 },
  bannerTitle: { color: '#fde68a', fontSize: 13, fontWeight: '800' },
  bannerText: { color: '#fcd34d', fontSize: 11, lineHeight: 16 },
  enableButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: '#f59e0b' },
  enableText: { color: '#1c1917', fontSize: 12, fontWeight: '800' },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', gap: 14 },
  sectionTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counters: { flexDirection: 'row', gap: 9 },
  smallMuted: { color: '#64748b', fontSize: 10 },
  preview: { width: '100%', height: 215, borderRadius: 10, backgroundColor: '#020617' },
  previewEmpty: { height: 115, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', borderStyle: 'dashed' },
  emptyText: { color: '#64748b', fontSize: 12, paddingVertical: 8 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  primaryButton: { minWidth: '48%', flexGrow: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, backgroundColor: '#0284c7' },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  secondaryButton: { minWidth: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  secondaryText: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  stopButton: { minWidth: '47%', flexGrow: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#b91c1c' },
  disabled: { opacity: 0.4 },
  error: { color: '#fda4af', fontSize: 12, padding: 12, backgroundColor: '#4c0519', borderRadius: 10 },
  verification: { padding: 12, borderRadius: 10, borderWidth: 1 },
  passed: { backgroundColor: '#064e3b', borderColor: '#10b981' },
  failed: { backgroundColor: '#4c0519', borderColor: '#fb7185' },
  verificationText: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  exportCard: { padding: 15, borderRadius: 14, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#0e7490', gap: 8 },
  exportLabel: { marginTop: 5, color: '#7dd3fc', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  exportPath: { color: '#cbd5e1', fontSize: 11, lineHeight: 16 },
  hash: { color: '#a7f3d0', fontFamily: 'monospace', fontSize: 10, lineHeight: 15 },
  exportButtons: { flexDirection: 'row', gap: 9, marginTop: 8 },
  examinerNote: { color: '#475569', fontSize: 10, textAlign: 'center', paddingBottom: 12 },
});
