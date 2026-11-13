import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ScreenName } from '../navigation/types.ts';

interface SidebarProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
  const navItems: { screen: ScreenName; label: string; testID: string }[] = [
    { screen: 'home', label: 'Dashboard', testID: 'nav-btn-home' },
    { screen: 'new_case', label: 'New Case', testID: 'nav-btn-new-case' },
    { screen: 'capture', label: 'Capture Feed', testID: 'nav-btn-capture' },
    { screen: 'report', label: 'Report & Cert', testID: 'nav-btn-report' },
  ];

  return (
    <View style={styles.sidebar} testID="app-sidebar">
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>SocialParse</Text>
        <Text style={styles.brandVersion}>v0.1.0 (macOS)</Text>
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
              <Text style={[styles.navButtonText, isActive && styles.navButtonTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Forensic Engine Active</Text>
        <Text style={styles.footerSubtext}>SHA-256 Audit Chain OK</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    backgroundColor: '#090d16',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    paddingVertical: 24,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  brand: {
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  brandVersion: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  navList: {
    flex: 1,
    gap: 8,
  },
  navButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  navButtonActive: {
    backgroundColor: '#1e293b',
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  navButtonText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  navButtonTextActive: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});
