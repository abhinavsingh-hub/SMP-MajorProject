import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RecentRunnerEvent } from '../runner/useScriptRunner';

const palettes = {
  success: { tint: '#34d399', icon: '✓' },
  failed: { tint: '#fb7185', icon: '×' },
  warning: { tint: '#fbbf24', icon: '!' },
  info: { tint: '#60a5fa', icon: '•' },
} as const;

export const EventRow: React.FC<{ event: RecentRunnerEvent }> = ({ event }) => {
  const palette = palettes[event.kind];
  const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <View style={styles.row}>
      <Text style={[styles.icon, { color: palette.tint }]}>{palette.icon}</Text>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={[styles.title, { color: palette.tint }]}>{event.title}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        {event.detail ? <Text style={styles.detail} numberOfLines={2}>{event.detail}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#233149' },
  icon: { width: 20, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  content: { flex: 1, gap: 4 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 13, fontWeight: '700' },
  time: { color: '#64748b', fontSize: 10 },
  detail: { color: '#94a3b8', fontSize: 11, lineHeight: 15 },
});
