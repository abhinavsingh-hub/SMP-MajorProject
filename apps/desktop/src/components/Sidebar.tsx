import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ScreenName } from '../navigation/types.ts';

interface SidebarProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
  const navItems: { screen: ScreenName; label: string; testID: string; icon: string }[] = [
    { screen: 'home', label: 'Dashboard', testID: 'nav-btn-home', icon: '▦' },
    { screen: 'new_case', label: 'New Case', testID: 'nav-btn-new-case', icon: '⊕' },
    { screen: 'capture', label: 'Capture Feed', testID: 'nav-btn-capture', icon: '▶' },
    { screen: 'report', label: 'Report & Cert', testID: 'nav-btn-report', icon: '§' },
  ];

  return (
    <View style={styles.sidebar} testID="app-sidebar">
      <View style={styles.topSection}>
        <View style={styles.brand}>
          <View style={styles.brandMarkContainer}>
            <Text style={styles.brandMark}>SP</Text>
          </View>
          <View style={styles.brandTextGroup}>
            <Text style={styles.brandTitle}>SocialParse</Text>
            <Text style={styles.brandSubtitle}>Evidence & Panchnama</Text>
          </View>
        </View>

        <View style={styles.navGroupLabel}>
          <Text style={styles.navGroupLabelText}>WORKSPACE</Text>
        </View>

        <View style={styles.navList}>
          {navItems.map((item) => {
            const isActive = currentScreen === item.screen;
            return (
              <TouchableOpacity
                key={item.screen}
                style={[styles.navButton, isActive && styles.navButtonActive]}
                onPress={() => onNavigate(item.screen)}
                testID={item.testID}
              >
                <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{item.icon}</Text>
                <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.examinerProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>RS</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.examinerName}>Insp. R. Sharma</Text>
            <Text style={styles.examinerUnit}>Cyber Crime Cell</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <View style={styles.statusTextGroup}>
            <Text style={styles.statusTitle}>SHA-256 Engine Active</Text>
            <Text style={styles.statusSubtitle}>Sec 65B / BSA §63 Chain OK</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E6E5E1',
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 4,
    gap: 10,
  },
  brandMarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#34445B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  brandTextGroup: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#242522',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#7A7875',
    marginTop: 1,
  },
  navGroupLabel: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  navGroupLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8C8B88',
    letterSpacing: 0.8,
  },
  navList: {
    gap: 3,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
    gap: 10,
  },
  navButtonActive: {
    backgroundColor: '#F4F3EF',
    borderLeftWidth: 3,
    borderLeftColor: '#34445B',
  },
  navIcon: {
    fontSize: 13,
    color: '#7A7875',
    width: 16,
    textAlign: 'center',
  },
  navIconActive: {
    color: '#34445B',
    fontWeight: '700',
  },
  navButtonText: {
    fontSize: 13,
    color: '#666562',
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: '#242522',
    fontWeight: '600',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E6E5E1',
    gap: 14,
  },
  examinerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF2F6',
    borderWidth: 1,
    borderColor: '#D4DAE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34445B',
  },
  profileText: {
    flex: 1,
  },
  examinerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#242522',
  },
  examinerUnit: {
    fontSize: 10,
    color: '#7A7875',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E6E5E1',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2E6B4E',
  },
  statusTextGroup: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#242522',
  },
  statusSubtitle: {
    fontSize: 9,
    color: '#7A7875',
    marginTop: 1,
  },
});
