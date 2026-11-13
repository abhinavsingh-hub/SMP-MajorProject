import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  MockCaptureWorkerClient,
  type CaptureWorkerClient,
  type PlatformId,
  type WorkerMessage,
  type ItemPayload,
} from '../services/capture-client.ts';

interface CaptureScreenProps {
  client?: CaptureWorkerClient;
  caseId?: string;
  caseFolder?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  client,
  caseId = 'CASE-2026-0001',
  caseFolder = '/tmp/smp_cases/CASE-2026-0001',
}) => {
  const [workerClient] = useState<CaptureWorkerClient>(
    () => client ?? new MockCaptureWorkerClient(),
  );

  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<PlatformId, boolean>>({
    facebook: true,
    instagram: true,
    twitter: true,
    google: false,
  });

  const [isCapturing, setIsCapturing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<string>('Ready to start');
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [userAlert, setUserAlert] = useState<{ message: string; timeout: number } | null>(null);
  const [capturedItems, setCapturedItems] = useState<ItemPayload[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const logsEndRef = useRef<ScrollView>(null);

  const togglePlatform = (id: PlatformId) => {
    if (isCapturing) return;
    setSelectedPlatforms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addLog = (type: string, message: string, level: LogEntry['level'] = 'info') => {
    const time = new Date().toISOString().split('T')[1].replace('Z', '');
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: time,
        type,
        message,
        level,
      },
    ]);
  };

  useEffect(() => {
    workerClient.connect();

    const unsubscribe = workerClient.onMessage((msg: WorkerMessage) => {
      switch (msg.type) {
        case 'progress': {
          setProgressPercent(msg.payload.percent);
          setActivePlatform(msg.payload.platform);
          setCurrentStatus(
            `${msg.payload.platform.toUpperCase()} → ${msg.payload.section} (${msg.payload.status})`,
          );
          addLog(
            'PROGRESS',
            `[${msg.payload.percent}%] ${msg.payload.platform}/${msg.payload.section}: ${msg.payload.status}`,
            'info',
          );
          if (msg.payload.status === 'running') {
            setUserAlert(null);
          }
          break;
        }

        case 'item': {
          setCapturedItems((prev) => [...prev, msg.payload]);
          addLog(
            'ITEM',
            `Captured ${msg.payload.item_id} (${msg.payload.platform}/${msg.payload.section}) - ${msg.payload.sha256.slice(0, 16)}...`,
            'success',
          );
          break;
        }

        case 'needs_user': {
          setUserAlert({
            message: msg.payload.message,
            timeout: msg.payload.timeout_seconds,
          });
          addLog(
            'NEEDS_USER',
            `[Action Required]: ${msg.payload.message} (${msg.payload.timeout_seconds}s)`,
            'warn',
          );
          break;
        }

        case 'error': {
          addLog(
            'ERROR',
            `[${msg.payload.code}] ${msg.payload.message} (${msg.payload.platform || 'General'})`,
            'error',
          );
          break;
        }

        case 'done': {
          setIsCapturing(false);
          setProgressPercent(100);
          setUserAlert(null);
          setCurrentStatus(`Finished: ${msg.payload.status}`);
          addLog(
            'DONE',
            `Session complete: ${msg.payload.status}. ${msg.payload.summary.items_captured} items captured.`,
            'success',
          );
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      workerClient.disconnect();
    };
  }, [workerClient]);

  const handleStartCapture = async () => {
    const chosenPlatforms = (Object.keys(selectedPlatforms) as PlatformId[]).filter(
      (k) => selectedPlatforms[k],
    );

    if (chosenPlatforms.length === 0) {
      addLog('WARN', 'Select at least one social media platform to capture.', 'warn');
      return;
    }

    setIsCapturing(true);
    setProgressPercent(0);
    setCapturedItems([]);
    setLogs([]);
    setUserAlert(null);
    addLog('START', `Initiating capture session for ${chosenPlatforms.join(', ')}...`);

    try {
      await workerClient.startCapture({
        case_id: caseId,
        case_folder: caseFolder,
        next_item_number: 1,
        platforms: chosenPlatforms,
        config: {
          sections: ['profile', 'feed'],
          max_items_per_section: 10,
          user_action_timeout_seconds: 300,
        },
      });
    } catch (err: unknown) {
      setIsCapturing(false);
      const msg = err instanceof Error ? err.message : String(err);
      addLog('ERROR', `Failed to start capture: ${msg}`, 'error');
    }
  };

  const platformsList: { id: PlatformId; label: string }[] = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'twitter', label: 'Twitter / X' },
    { id: 'google', label: 'Google' },
  ];

  return (
    <View style={styles.container} testID="screen-capture">
      <View style={styles.header}>
        <Text style={styles.title}>Automated Evidence Capture</Text>
        <Text style={styles.subtitle}>
          Select target feeds to harvest. Streams live worker protocol events and verifies hashes.
        </Text>
      </View>

      {/* Platform Checkboxes Card */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>Target Platforms</Text>
        <View style={styles.platformRow}>
          {platformsList.map((p) => {
            const isChecked = selectedPlatforms[p.id];
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.checkboxContainer, isChecked && styles.checkboxActive]}
                onPress={() => togglePlatform(p.id)}
                disabled={isCapturing}
                testID={`checkbox-${p.id}`}
              >
                <View style={[styles.checkbox, isChecked && styles.checkedBox]}>
                  {isChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.platformLabel, isChecked && styles.platformLabelActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.startButton, isCapturing && styles.startButtonDisabled]}
            onPress={handleStartCapture}
            disabled={isCapturing}
            testID="btn-start-capture"
          >
            {isCapturing ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.startButtonText}>Start Capture Session</Text>
            )}
          </TouchableOpacity>
          <View style={styles.caseBadge}>
            <Text style={styles.caseBadgeText}>Active Case: {caseId}</Text>
          </View>
        </View>
      </View>

      {/* Needs User Alert Box */}
      {userAlert ? (
        <View style={styles.alertBox} testID="user-action-alert">
          <Text style={styles.alertTitle}>⚠️ User Action Required</Text>
          <Text style={styles.alertBody}>{userAlert.message}</Text>
          <Text style={styles.alertFooter}>
            Please interact directly with the browser window opened by the capture worker.
          </Text>
        </View>
      ) : null}

      {/* Progress Card */}
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress: {progressPercent}%</Text>
          <Text style={styles.statusLabel}>
            {activePlatform ? `[${activePlatform.toUpperCase()}] ` : ''}
            {currentStatus}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Live Captured Items & Protocol Event Logs */}
      <View style={styles.bottomGrid}>
        {/* Items List */}
        <View style={[styles.card, styles.gridCol]}>
          <Text style={styles.cardHeader}>Captured Screenshots ({capturedItems.length})</Text>
          <ScrollView style={styles.itemListScroll}>
            {capturedItems.length === 0 ? (
              <Text style={styles.emptyText}>No items captured yet in this session.</Text>
            ) : (
              capturedItems.map((item) => (
                <View key={item.item_id} style={styles.itemRow} testID={`item-${item.item_id}`}>
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>{item.item_id}</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemPath} numberOfLines={1}>
                      {item.file_path}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {item.platform} • {item.section} • {Math.round(item.file_size_bytes / 1024)} KB
                    </Text>
                    <Text style={styles.itemHash} numberOfLines={1}>
                      SHA-256: {item.sha256}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Live Protocol Logs */}
        <View style={[styles.card, styles.gridCol]}>
          <Text style={styles.cardHeader}>Worker Protocol Event Log</Text>
          <ScrollView
            ref={logsEndRef}
            style={styles.logScroll}
            onContentSizeChange={() => logsEndRef.current?.scrollToEnd({ animated: true })}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>Worker logs will appear here when capture starts.</Text>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <Text style={styles.logTime}>{log.timestamp}</Text>
                  <Text
                    style={[
                      styles.logType,
                      log.level === 'warn' && styles.logWarn,
                      log.level === 'error' && styles.logError,
                      log.level === 'success' && styles.logSuccess,
                    ]}
                  >
                    [{log.type}]
                  </Text>
                  <Text style={styles.logMsg}>{log.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  checkboxContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkboxActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c2438',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  checkmark: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
  },
  platformLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  platformLabelActive: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startButton: {
    backgroundColor: '#38bdf8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.5,
  },
  startButtonText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  caseBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  caseBadgeText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '500',
  },
  alertBox: {
    backgroundColor: '#78350f',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fef3c7',
    marginBottom: 4,
  },
  alertBody: {
    fontSize: 13,
    color: '#fffbeb',
    marginBottom: 6,
  },
  alertFooter: {
    fontSize: 11,
    color: '#fde68a',
    fontStyle: 'italic',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f8fafc',
  },
  statusLabel: {
    fontSize: 12,
    color: '#38bdf8',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#0f172a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  bottomGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  gridCol: {
    flex: 1,
    marginBottom: 0,
  },
  itemListScroll: {
    flex: 1,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  itemBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  itemBadgeText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '700',
  },
  itemDetails: {
    flex: 1,
  },
  itemPath: {
    color: '#f8fafc',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  itemMeta: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  itemHash: {
    color: '#64748b',
    fontSize: 9,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  logScroll: {
    flex: 1,
    backgroundColor: '#090d16',
    borderRadius: 6,
    padding: 10,
  },
  logRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  logTime: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  logType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
    fontFamily: 'monospace',
  },
  logWarn: {
    color: '#f59e0b',
  },
  logError: {
    color: '#ef4444',
  },
  logSuccess: {
    color: '#22c55e',
  },
  logMsg: {
    flex: 1,
    fontSize: 10,
    color: '#e2e8f0',
    fontFamily: 'monospace',
  },
});
