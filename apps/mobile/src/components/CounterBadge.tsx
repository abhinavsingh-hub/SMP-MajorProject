import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CounterBadgeProps {
  label: string;
  count: number;
  color: string;
}

export const CounterBadge: React.FC<CounterBadgeProps> = ({ label, count, color }) => (
  <View style={styles.container}>
    <Text style={[styles.count, { color }]}>{count}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 70, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111c2d', borderRadius: 12, gap: 3 },
  count: { fontSize: 23, fontWeight: '800' },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
});
