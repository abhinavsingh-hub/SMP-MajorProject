import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export const ReportScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container} testID="screen-report">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbItem}>FORENSIC WORKSPACE</Text>
          <Text style={styles.breadcrumbDivider}>/</Text>
          <Text style={styles.breadcrumbActive}>PANCHNAMA CERTIFICATION</Text>
        </View>
        <Text style={styles.title}>Forensic Report & Panchnama Studio</Text>
        <Text style={styles.subtitle}>
          Admissible electronic evidence certificate under Section 65B Indian Evidence Act and Section 63 Bharatiya Sakshya Adhiniyam 2023.
        </Text>
      </View>

      {/* Verification Status Card */}
      <View style={styles.verificationBanner}>
        <View style={styles.bannerIconBadge}>
          <Text style={styles.bannerIcon}>✓</Text>
        </View>
        <View style={styles.bannerTextGroup}>
          <Text style={styles.bannerTitle}>Cryptographic Integrity Verified</Text>
          <Text style={styles.bannerDescription}>
            All 4 captured evidence items match exact SHA-256 checksums recorded in manifest.json and hashes.csv.
          </Text>
          <Text style={styles.bannerHash}>
            Master Register SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
          </Text>
        </View>
      </View>

      {/* Case Details & Certificate Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Case Seizure Details</Text>
          <Text style={styles.caseBadge}>CASE-2026-0042</Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>FIR / POLICE DIARY NUMBER</Text>
            <Text style={styles.metaValue}>CCU/FIR/118/2026</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>LEAD INVESTIGATING EXAMINER</Text>
            <Text style={styles.metaValue}>Priya Deshmukh (Sub-Inspector)</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>INVESTIGATING UNIT</Text>
            <Text style={styles.metaValue}>Cyber Crime Investigation Unit, Zone 1</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TARGET SUBJECT / ACCUSED</Text>
            <Text style={styles.metaValue}>Sample Accused</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SEIZURE HARDWARE</Text>
            <Text style={styles.metaValue}>EXAMINER-MAC-01 (macOS 14.5)</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>EVIDENCE INVENTORY</Text>
            <Text style={styles.metaValue}>4 files (2 Instagram, 2 Facebook)</Text>
          </View>
        </View>
      </View>

      {/* Statutory Legal Declaration */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Statutory Panchnama Declaration</Text>
          <Text style={styles.legalBadge}>Sec 65B(4) IEA & Sec 63 BSA</Text>
        </View>

        <View style={styles.declarationBox}>
          <Text style={styles.declarationText}>
            "I hereby certify that the electronic records and feed captures detailed in this Panchnama
            were produced by the computer during the period over which the computer was used regularly
            to store and process digital media evidence. Throughout the extraction, the seizure hardware
            operated properly, and the cryptographic integrity of the extracted files was verified using
            SHA-256 hash algorithms conforming to standard ISO/IEC 10118-3."
          </Text>
        </View>

        {/* 3 Signatory Panels */}
        <View style={styles.signatoriesGrid}>
          <View style={styles.signatoryCard}>
            <Text style={styles.signatoryRole}>INVESTIGATING EXAMINER</Text>
            <View style={styles.signaturePlaceholder}>
              <Text style={styles.signedTag}>Signed Digitally</Text>
            </View>
            <Text style={styles.signatoryName}>Priya Deshmukh</Text>
            <Text style={styles.signatoryRank}>Sub-Inspector, Cyber Unit</Text>
          </View>

          <View style={styles.signatoryCard}>
            <Text style={styles.signatoryRole}>INDEPENDENT WITNESS 1 (PANCH 1)</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatoryPending}>Pending Witness Signature</Text>
            <Text style={styles.signatoryRank}>Independent Citizen / Officer</Text>
          </View>

          <View style={styles.signatoryCard}>
            <Text style={styles.signatoryRole}>INDEPENDENT WITNESS 2 (PANCH 2)</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatoryPending}>Pending Witness Signature</Text>
            <Text style={styles.signatoryRank}>Independent Citizen / Officer</Text>
          </View>
        </View>
      </View>

      {/* Export & Actions Card */}
      <View style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <Text style={styles.cardTitle}>Report Export & Distribution</Text>
          <Text style={styles.cardSubtitle}>
            Self-contained HTML package and Section 65B evidentiary certificate bundle
          </Text>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.primaryActionButton}>
            <Text style={styles.primaryActionButtonText}>Open Standalone HTML Panchnama</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionButton}>
            <Text style={styles.secondaryActionButtonText}>Print / Export PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryActionButton}>
            <Text style={styles.secondaryActionButtonText}>Re-Verify Hash Register</Text>
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
  verificationBanner: {
    flexDirection: 'row',
    backgroundColor: '#EBF4EF',
    borderWidth: 1,
    borderColor: '#CCE3D6',
    borderRadius: 8,
    padding: 18,
    marginBottom: 24,
    gap: 14,
    alignItems: 'flex-start',
  },
  bannerIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2E6B4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIcon: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerTextGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E6B4E',
    marginBottom: 2,
  },
  bannerDescription: {
    fontSize: 12,
    color: '#345241',
    lineHeight: 16,
    marginBottom: 4,
  },
  bannerHash: {
    fontSize: 10,
    color: '#2E6B4E',
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
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#242522',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#7A7875',
    marginTop: 2,
  },
  caseBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34445B',
    backgroundColor: '#EFF2F6',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  legalBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2E6B4E',
    backgroundColor: '#EBF4EF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    width: '30%',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8C8B88',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 12,
    color: '#242522',
    fontWeight: '500',
  },
  declarationBox: {
    backgroundColor: '#F8F8F6',
    borderLeftWidth: 3,
    borderLeftColor: '#34445B',
    padding: 14,
    borderRadius: 4,
    marginBottom: 20,
  },
  declarationText: {
    fontSize: 12,
    color: '#3B3A36',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  signatoriesGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  signatoryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 6,
    padding: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  signatoryRole: {
    fontSize: 9,
    fontWeight: '600',
    color: '#7A7875',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  signaturePlaceholder: {
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  signedTag: {
    fontSize: 11,
    color: '#2E6B4E',
    fontWeight: '600',
    backgroundColor: '#EBF4EF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  signatureLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#DCDAD5',
    marginBottom: 14,
    marginTop: 20,
  },
  signatoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#242522',
  },
  signatoryRank: {
    fontSize: 10,
    color: '#7A7875',
    marginTop: 1,
  },
  signatoryPending: {
    fontSize: 10,
    color: '#8C8B88',
    fontStyle: 'italic',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E5E1',
    borderRadius: 8,
    padding: 20,
    marginBottom: 32,
  },
  actionHeader: {
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    backgroundColor: '#34445B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryActionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCDAD5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  secondaryActionButtonText: {
    color: '#242522',
    fontSize: 12,
    fontWeight: '500',
  },
});
