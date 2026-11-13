import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProgressBarProps {
  index: number;
  total: number;
  label: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ index, total, label }) => {
  const ratio = total > 0 ? Math.min(1, index / total) : 0;
  return (
    <View style={styles.container}>
      <View style={styles.line}>
        <Text style={styles.stepText}>Step {Math.min(index, total)} of {total}</Text>
        <Text style={styles.percent}>{Math.round(ratio * 100)}%</Text>
      </View>
      <View style={styles.track}><View style={[styles.fill, { width: `${ratio * 100}%` }]} /></View>
      <Text style={styles.label} numberOfLines={2}>{label || 'Waiting to start'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 9 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepText: { color: '#e2e8f0', fontSize: 14, fontWeight: '700' },
  percent: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  track: { height: 8, overflow: 'hidden', borderRadius: 8, backgroundColor: '#1e293b' },
  fill: { height: '100%', borderRadius: 8, backgroundColor: '#0ea5e9' },
  label: { minHeight: 18, color: '#94a3b8', fontSize: 13 },
});
