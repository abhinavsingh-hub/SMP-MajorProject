import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { ScreenName } from '../navigation/types.ts';

interface HomeScreenProps {
  onNavigate: (screen: ScreenName) => void;
  activeCaseId?: string;
}

interface CaseRow {
  caseId: string;
  caseNumber: string;
  accused: string;
  agency: string;
  itemCount: number;
  status: 'In Progress' | 'Certified' | 'Seizure Active';
}

const RECENT_CASES: CaseRow[] = [
  {
    caseId: 'CASE-2026-0042',
    caseNumber: 'CCU/FIR/118/2026',
    accused: 'R. K. Mehra',
    agency: 'Cyber Crime Investigation Unit, Zone 1',
    itemCount: 4,
    status: 'Certified',
  },
  {
    caseId: 'CASE-2026-0001',
    caseNumber: 'FIR-102/2026',
    accused: 'Suresh Patel',
    agency: 'Special Cell, Cyber Operations',
    itemCount: 2,
    status: 'Seizure Active',
  },
  {
    caseId: 'CASE-2026-0002',
    caseNumber: 'FIR-109/2026',
    accused: 'A. Singhania',
    agency: 'Economic Offences Wing, Cyber Division',
    itemCount: 6,
    status: 'In Progress',
  },
];

const AUDIT_EVENTS = [
  {
    seq: '#004',
    type: 'case_verified',
    hash: '7b8e...d31a',
    time: '11:42:10 UTC',
    details: 'Full SHA-256 hash tree validation passed (4/4 items match)',
  },
  {
    seq: '#003',
    type: 'item_captured',
    hash: 'db6e...0376',
    time: '11:34:27 UTC',
    details: 'facebook/screenshots/feed_0004 recorded to manifest.json',
  },
  {
    seq: '#002',
    type: 'item_captured',
    hash: '1071...4324',
    time: '11:32:21 UTC',
    details: 'instagram/screenshots/feed_0002 recorded to manifest.json',
  },
  {
    seq: '#001',
    type: 'case_created',
    hash: '0000...0000',
    time: '10:15:02 UTC',
    details: 'Genesis block sealed with zero-hash for CASE-2026-0042',
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  activeCaseId = 'CASE-2026-0042',
}) => {
  return (
    <ScrollView style={styles.container} testID="screen-home">
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbItem}>FORENSIC WORKSPACE</Text>
            <Text style={styles.breadcrumbDivider}>/</Text>
            <Text style={styles.breadcrumbActive}>OVERVIEW</Text>
          </View>
          <Text style={styles.title}>Evidence & Panchnama Console</Text>
          <Text style={styles.subtitle}>
            Operating under Section 65B Indian Evidence Act & Section 63 Bharatiya Sakshya Adhiniyam
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <View style={styles.liveIndicator} />
          <Text style={styles.headerBadgeText}>SHA-256 Chain Intact</Text>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>REGISTERED CASES</Text>
          <Text style={styles.metricValue}>3</Text>
          <Text style={styles.metricNote}>2 active, 1 certified</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>EVIDENCE ITEMS</Text>
          <Text style={styles.metricValue}>12</Text>
          <Text style={styles.metricNote}>Hashed & manifest-linked</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>INTEGRITY CHECK</Text>
          <Text style={[styles.metricValue, styles.textSuccess]}>100%</Text>
          <Text style={styles.metricNote}>0 audit gaps detected</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>PRIMARY WORKSTATION</Text>
          <Text style={styles.metricValueMonospace}>EXAMINER-01</Text>
          <Text style={styles.metricNote}>macOS 14.5 • Core Engine v0.1.0</Text>
        </View>
      </View>

      {/* Quick Action Navigation Buttons */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.sectionSubtitle}>Select next forensic step in the chain of custody</Text>
      </View>

      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('new_case')}
          testID="btn-nav-new-case"
        >
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>⊕</Text>
          </View>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionButtonText}>Register New Case</Text>
            <Text style={styles.actionButtonSubtext}>
              Provision folder, manifest, and genesis audit block
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('capture')}
          testID="btn-nav-capture"
        >
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>▶</Text>
          </View>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionButtonText}>Capture Feed Evidence</Text>
            <Text style={styles.actionButtonSubtext}>
              Automated social media feed capture with live hashing
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onNavigate('report')}
          testID="btn-nav-report"
        >
          <View style={styles.actionIconContainer}>
            <Text style={styles.actionIcon}>§</Text>
          </View>
          <View style={styles.actionTextGroup}>
            <Text style={styles.actionButtonText}>Verify & Certify</Text>
            <Text style={styles.actionButtonSubtext}>
              Generate Section 65B Panchnama with QR authentication
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Active Session Card */}
      <View style={styles.activeCaseCard}>
        <View style={styles.activeCaseHeader}>
          <View>
            <Text style={styles.activeCaseEyebrow}>CURRENT FORENSIC SESSION</Text>
            <Text style={styles.activeCaseId}>{activeCaseId}</Text>
          </View>
          <View style={styles.statusPillActive}>
            <Text style={styles.statusPillActiveText}>Active Case Loaded</Text>
          </View>
        </View>

        <View style={styles.activeCaseDetailsGrid}>
          <View style={styles.activeDetailItem}>
            <Text style={styles.activeDetailLabel}>FIR / CASE NUMBER</Text>
            <Text style={styles.activeDetailValue}>CCU/FIR/118/2026</Text>
          </View>
          <View style={styles.activeDetailItem}>
            <Text style={styles.activeDetailLabel}>LEAD EXAMINER</Text>
            <Text style={styles.activeDetailValue}>Insp. Rajesh Sharma</Text>
          </View>
          <View style={styles.activeDetailItem}>
            <Text style={styles.activeDetailLabel}>ACCUSED / SUBJECT</Text>
            <Text style={styles.activeDetailValue}>R. K. Mehra</Text>
          </View>
          <View style={styles.activeDetailItem}>
            <Text style={styles.activeDetailLabel}>TARGET PLATFORMS</Text>
            <Text style={styles.activeDetailValue}>Instagram, Facebook</Text>
          </View>
        </View>
      </View>

      {/* Dual Column: Recent Cases Table & Recent Activity Stream */}
      <View style={styles.splitSection}>
        {/* Left: Recent Cases Table */}
        <View style={styles.casesTableContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Cases</Text>
            <Text style={styles.sectionSubtitle}>Managed forensic cases and their seizure status</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>CASE ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.6 }]}>FIR / NUMBER</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.4 }]}>SUBJECT</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8, textAlign: 'center' }]}>ITEMS</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>STATUS</Text>
            </View>

            {RECENT_CASES.map((c) => (
              <View key={c.caseId} style={styles.tableRow}>
                <Text style={[styles.tableCellMonospace, { flex: 1.4 }]}>{c.caseId}</Text>
                <Text style={[styles.tableCell, { flex: 1.6 }]}>{c.caseNumber}</Text>
                <Text style={[styles.tableCell, { flex: 1.4 }]}>{c.accused}</Text>
                <Text style={[styles.tableCell, { flex: 0.8, textAlign: 'center' }]}>
                  {c.itemCount}
                </Text>
                <View style={styles.tableCellStatusWrapper}>
                  <Text
                    style={[
                      styles.tableStatusPill,
                      c.status === 'Certified'
                        ? styles.pillSuccess
                        : c.status === 'Seizure Active'
                          ? styles.pillActive
                          : styles.pillNeutral,
                    ]}
                  >
                    {c.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Right: Cryptographic Activity Log */}
        <View style={styles.activityContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Audit Trail</Text>
            <Text style={styles.sectionSubtitle}>SHA-256 chained log stream</Text>
          </View>

          <View style={styles.activityList}>
            {AUDIT_EVENTS.map((event) => (
              <View key={event.seq} style={styles.activityItem}>
                <View style={styles.activityTop}>
                  <Text style={styles.activitySeq}>{event.seq}</Text>
                  <Text style={styles.activityType}>{event.type}</Text>
                  <Text style={styles.activityTime}>{event.time}</Text>
                </View>
                <Text style={styles.activityDetails}>{event.details}</Text>
                <Text style={styles.activityHash}>Hash: {event.hash}</Text>
              </View>
            ))}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerTitleGroup: {
    flex: 1,
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4EF',
    borderWidth: 1,
    borderColor: '#CCE3D6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E6B4E',
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E6B4E',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E5E1',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A7875',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#242522',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  metricValueMonospace: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34445B',
    marginBottom: 4,
  },
  textSuccess: {
    color: '#2E6B4E',
  },
  metricNote: {
    fontSize: 11,
    color: '#8C8B88',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#242522',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#7A7875',
    marginTop: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  actionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#EFF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 14,
    color: '#34445B',
    fontWeight: '700',
  },
  actionTextGroup: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#242522',
    marginBottom: 2,
  },
  actionButtonSubtext: {
    fontSize: 11,
    color: '#7A7875',
    lineHeight: 15,
  },
  actionArrow: {
    fontSize: 14,
    color: '#8C8B88',
  },
  activeCaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E5E1',
    marginBottom: 28,
  },
  activeCaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EFEA',
    marginBottom: 14,
  },
  activeCaseEyebrow: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7A7875',
    letterSpacing: 0.8,
  },
  activeCaseId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34445B',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  statusPillActive: {
    backgroundColor: '#EFF2F6',
    borderWidth: 1,
    borderColor: '#D4DAE2',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusPillActiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34445B',
  },
  activeCaseDetailsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  activeDetailItem: {
    flex: 1,
  },
  activeDetailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8C8B88',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  activeDetailValue: {
    fontSize: 12,
    color: '#242522',
    fontWeight: '500',
  },
  splitSection: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  casesTableContainer: {
    flex: 1.4,
  },
  table: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F6',
    paddingVertical: 10,
    paddingHorizontal: 14,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F3EF',
  },
  tableCell: {
    fontSize: 12,
    color: '#242522',
  },
  tableCellMonospace: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34445B',
  },
  tableCellStatusWrapper: {
    flex: 1.2,
    alignItems: 'flex-end',
  },
  tableStatusPill: {
    fontSize: 10,
    fontWeight: '600',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pillSuccess: {
    backgroundColor: '#EBF4EF',
    color: '#2E6B4E',
  },
  pillActive: {
    backgroundColor: '#EFF2F6',
    color: '#34445B',
  },
  pillNeutral: {
    backgroundColor: '#F4F3EF',
    color: '#666562',
  },
  activityContainer: {
    flex: 1,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  activityItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8F8F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activitySeq: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34445B',
  },
  activityType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#242522',
  },
  activityTime: {
    fontSize: 10,
    color: '#8C8B88',
  },
  activityDetails: {
    fontSize: 11,
    color: '#666562',
    lineHeight: 15,
    marginBottom: 4,
  },
  activityHash: {
    fontSize: 9,
    color: '#7A7875',
  },
});
