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
  const [currentStatus, setCurrentStatus] = useState<string>('Ready to start capture');
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
            `Hashed ${msg.payload.item_id}: ${msg.payload.sha256.substring(0, 16)}... (${msg.payload.platform}/${msg.payload.section})`,
            'success',
          );
          break;
        }

        case 'needs_user': {
          setUserAlert({
            message: msg.payload.message,
            timeout: msg.payload.timeout_seconds,
          });
          addLog('NEEDS_USER', `Manual Intervention: ${msg.payload.message}`, 'warn');
          break;
        }

        case 'done': {
          setIsCapturing(false);
          setProgressPercent(100);
          setCurrentStatus('Capture Completed • Manifest and Hash Chain Sealed');
          addLog(
            'DONE',
            `Capture finished: ${msg.payload.summary.items_captured} items captured across ${msg.payload.summary.platforms.join(', ')}`,
            'success',
          );
          break;
        }

        case 'error': {
          setIsCapturing(false);
          setCurrentStatus(`Error: ${msg.payload.message}`);
          addLog('ERROR', `${msg.payload.code}: ${msg.payload.message}`, 'error');
          break;
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [workerClient]);

  const handleStartCapture = async () => {
    const platformsToRun = (Object.keys(selectedPlatforms) as PlatformId[]).filter(
      (p) => selectedPlatforms[p],
    );

    if (platformsToRun.length === 0) {
      addLog('WARN', 'Select at least one social media platform to capture', 'warn');
      return;
    }

    setIsCapturing(true);
    setProgressPercent(0);
    setCapturedItems([]);
    setLogs([]);
    setUserAlert(null);
    addLog('INIT', `Starting capture session for Case ${caseId}`, 'info');

    try {
      await workerClient.startCapture({
        case_id: caseId,
        case_folder: caseFolder,
        next_item_number: capturedItems.length + 1,
        platforms: platformsToRun,
        config: {
          sections: ['profile', 'feed'],
          max_items_per_section: 5,
          user_action_timeout_seconds: 60,
        },
      });
    } catch (err: unknown) {
      setIsCapturing(false);
      const msg = err instanceof Error ? err.message : String(err);
      addLog('ERROR', `Failed to start capture: ${msg}`, 'error');
    }
  };

  const platforms: { id: PlatformId; label: string }[] = [
    { id: 'facebook', label: 'Facebook' },
    { id: 'instagram', label: 'Instagram' },
    { id: 'twitter', label: 'Twitter / X' },
    { id: 'google', label: 'Google Takeout' },
  ];

  const selectedCount = Object.values(selectedPlatforms).filter(Boolean).length;

  return (
    <ScrollView style={styles.container} testID="screen-capture">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbItem}>FORENSIC WORKSPACE</Text>
          <Text style={styles.breadcrumbDivider}>/</Text>
          <Text style={styles.breadcrumbActive}>EVIDENCE CAPTURE</Text>
        </View>
        <Text style={styles.title}>Automated Feed Capture Session</Text>
        <Text style={styles.subtitle}>
          Active Case: <Text style={styles.subtitleBold}>{caseId}</Text> • Storage: {caseFolder}
        </Text>
      </View>

      {/* Target Platforms Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>1. Target Platforms Scope</Text>
          <Text style={styles.cardBadge}>{selectedCount} selected</Text>
        </View>
        <Text style={styles.cardDescription}>
          Select social media platforms to extract feeds, profiles, and media pursuant to warrant parameters.
        </Text>

        <View style={styles.platformsRow}>
          {platforms.map((p) => {
            const isSelected = selectedPlatforms[p.id];
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.platformButton,
                  isSelected && styles.platformButtonSelected,
                  isCapturing && styles.disabledOption,
                ]}
                onPress={() => togglePlatform(p.id)}
                disabled={isCapturing}
                testID={`checkbox-${p.id}`}
              >
                <View style={[styles.checkboxIndicator, isSelected && styles.checkboxIndicatorActive]}>
                  {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={[styles.platformButtonText, isSelected && styles.platformButtonTextSelected]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Execution Control Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>2. Capture Execution & Progress</Text>
          <Text style={styles.statusLabel}>{currentStatus}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressPercentage}>{progressPercent}% completed</Text>
            {activePlatform && <Text style={styles.activePlatformLabel}>Active: {activePlatform}</Text>}
          </View>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[
              styles.startCaptureButton,
              isCapturing ? styles.startCaptureButtonDisabled : null,
            ]}
            onPress={handleStartCapture}
            disabled={isCapturing}
            testID="btn-start-capture"
          >
            {isCapturing ? (
              <View style={styles.buttonLoadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.startCaptureButtonText}>Capturing Feeds...</Text>
              </View>
            ) : (
              <Text style={styles.startCaptureButtonText}>Start Capture Session</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* User Intervention Alert Box */}
      {userAlert && (
        <View style={styles.alertBox} testID="user-action-alert">
          <View style={styles.alertIconBadge}>
            <Text style={styles.alertIcon}>!</Text>
          </View>
          <View style={styles.alertTextGroup}>
            <Text style={styles.alertTitle}>Examiner Action Required</Text>
            <Text style={styles.alertMessage}>{userAlert.message}</Text>
            <Text style={styles.alertTimeout}>
              Session pause timeout: {userAlert.timeout} seconds remaining
            </Text>
          </View>
        </View>
      )}

      {/* Captured Evidence Items Register */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>3. Captured Evidence Register</Text>
          <Text style={styles.cardBadge}>{capturedItems.length} items verified</Text>
        </View>

        {capturedItems.length === 0 ? (
          <View style={styles.emptyItemsState}>
            <Text style={styles.emptyItemsText}>
              No items captured in this session yet. Start the capture session above to stream evidence.
            </Text>
          </View>
        ) : (
          <View style={styles.evidenceTable}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>ITEM ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>PLATFORM</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>SECTION</Text>
              <Text style={[styles.tableHeaderCell, { flex: 3.6 }]}>SHA-256 HASH</Text>
            </View>

            {capturedItems.map((item) => (
              <View key={item.item_id} style={styles.tableRow} testID={`item-${item.item_id}`}>
                <Text style={[styles.itemCellId, { flex: 1.2 }]}>{item.item_id}</Text>
                <View style={[styles.platformBadgeWrapper, { flex: 1.2 }]}>
                  <Text style={styles.platformBadge}>{item.platform.toUpperCase()}</Text>
                </View>
                <Text style={[styles.itemCellSection, { flex: 1 }]}>{item.section}</Text>
                <Text style={[styles.itemCellHash, { flex: 3.6 }]}>{item.sha256}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Protocol Audit Stream */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>4. Protocol Stream & Audit Log</Text>
          <Text style={styles.cardBadge}>{logs.length} events</Text>
        </View>

        <ScrollView style={styles.logContainer} ref={logsEndRef}>
          {logs.length === 0 ? (
            <Text style={styles.logEmptyText}>Worker protocol idle. Logs will appear during capture.</Text>
          ) : (
            logs.map((log) => (
              <View key={log.id} style={styles.logLine}>
                <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                <Text
                  style={[
                    styles.logType,
                    log.level === 'error'
                      ? styles.logError
                      : log.level === 'warn'
                        ? styles.logWarn
                        : log.level === 'success'
                          ? styles.logSuccess
                          : styles.logInfo,
                  ]}
                >
                  [{log.type}]
                </Text>
                <Text style={styles.logMessage}>{log.message}</Text>
              </View>
            ))
          )}
        </ScrollView>
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
  subtitleBold: {
    fontWeight: '600',
    color: '#34445B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#242522',
  },
  cardBadge: {
    fontSize: 11,
    color: '#7A7875',
    backgroundColor: '#F4F3EF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#34445B',
  },
  cardDescription: {
    fontSize: 12,
    color: '#666562',
    marginBottom: 16,
    lineHeight: 16,
  },
  platformsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  platformButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCDAD5',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  platformButtonSelected: {
    borderColor: '#34445B',
    backgroundColor: '#EFF2F6',
  },
  disabledOption: {
    opacity: 0.6,
  },
  checkboxIndicator: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#B0AFA9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxIndicatorActive: {
    borderColor: '#34445B',
    backgroundColor: '#34445B',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  platformButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666562',
  },
  platformButtonTextSelected: {
    color: '#242522',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#EBEBE6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34445B',
    borderRadius: 3,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34445B',
  },
  activePlatformLabel: {
    fontSize: 11,
    color: '#7A7875',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  startCaptureButton: {
    backgroundColor: '#34445B',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    alignItems: 'center',
  },
  startCaptureButtonDisabled: {
    opacity: 0.6,
  },
  startCaptureButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF3E8',
    borderWidth: 1,
    borderColor: '#EDE0CA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  alertIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8A611E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIcon: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  alertTextGroup: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A611E',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    color: '#63430C',
    lineHeight: 16,
    marginBottom: 4,
  },
  alertTimeout: {
    fontSize: 11,
    color: '#8A611E',
    fontWeight: '500',
  },
  emptyItemsState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyItemsText: {
    fontSize: 12,
    color: '#8C8B88',
    textAlign: 'center',
  },
  evidenceTable: {
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E5E1',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A7875',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F3EF',
  },
  itemCellId: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34445B',
  },
  platformBadgeWrapper: {
    alignItems: 'flex-start',
  },
  platformBadge: {
    fontSize: 9,
    fontWeight: '600',
    backgroundColor: '#EFF2F6',
    color: '#34445B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  itemCellSection: {
    fontSize: 11,
    color: '#666562',
  },
  itemCellHash: {
    fontSize: 10,
    color: '#7A7875',
  },
  logContainer: {
    height: 140,
    backgroundColor: '#F8F8F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E6E5E1',
    padding: 10,
  },
  logEmptyText: {
    fontSize: 11,
    color: '#8C8B88',
  },
  logLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  logTimestamp: {
    fontSize: 10,
    color: '#8C8B88',
  },
  logType: {
    fontSize: 10,
    fontWeight: '700',
  },
  logInfo: {
    color: '#34445B',
  },
  logSuccess: {
    color: '#2E6B4E',
  },
  logWarn: {
    color: '#8A611E',
  },
  logError: {
    color: '#9E3834',
  },
  logMessage: {
    fontSize: 11,
    color: '#242522',
    flex: 1,
  },
});
