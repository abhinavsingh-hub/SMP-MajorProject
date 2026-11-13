import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { HomeScreenProps } from '../navigation/types';
import { findResumableCases, type ResumableCase } from '../evidence/runState';

interface PlatformItem {
  id: string;
  name: string;
  description: string;
}

const PLATFORMS: PlatformItem[] = [
  { id: 'telegram', name: 'Telegram', description: 'Secret chats, channels, direct messages' },
  { id: 'whatsapp', name: 'WhatsApp', description: 'Chat threads, contact info, media feeds' },
  { id: 'instagram', name: 'Instagram', description: 'Profiles, stories, posts, direct inbox' },
  { id: 'facebook', name: 'Facebook', description: 'Timeline, groups, comments, user pages' },
  { id: 'google', name: 'Google', description: 'Google Account activity, search, services' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [resumableCases, setResumableCases] = useState<ResumableCase[]>([]);
  useEffect(() => { void findResumableCases().then(setResumableCases); }, []);
  const handleSelectPlatform = (platform: string) => {
    navigation.navigate('CaseInfo', { platform });
  };

  const renderItem = ({ item }: { item: PlatformItem }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => handleSelectPlatform(item.name)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.platformName}>{item.name}</Text>
        <Text style={styles.chevron}>→</Text>
      </View>
      <Text style={styles.platformDescription}>{item.description}</Text>
    </Pressable>
  );

  const renderResumeCard = () => resumableCases.length ? (
    <View style={styles.resumeGroup}>
      <Text style={styles.resumeHeading}>Resume previous capture</Text>
      {resumableCases.map((item) => (
        <Pressable key={item.caseDir} style={styles.resumeCard} onPress={() => navigation.navigate('Capture', {
          platform: item.runState.platform, caseNumber: item.caseNumber, examinerName: item.examinerName,
          accusedName: item.accusedName, caseDir: item.caseDir, resumeState: item.runState,
        })}>
          <Text style={styles.resumeTitle}>{item.runState.platform} · {item.caseNumber}</Text>
          <Text style={styles.resumeSubtitle}>Last completed step {item.runState.index >= 0 ? item.runState.index + 1 : 'none yet'} · Tap to continue</Text>
        </Pressable>
      ))}
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Investigation Target</Text>
        <Text style={styles.headerSubtitle}>
          Choose the social feed platform to initiate evidentiary capture
        </Text>
      </View>
      <FlatList
        data={PLATFORMS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderResumeCard}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  resumeGroup: { gap: 8, marginBottom: 4 },
  resumeHeading: { color: '#fbbf24', fontSize: 14, fontWeight: '800' },
  resumeCard: { backgroundColor: '#422006', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#92400e', gap: 4 },
  resumeTitle: { color: '#fde68a', fontSize: 14, fontWeight: '700' },
  resumeSubtitle: { color: '#fcd34d', fontSize: 12 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardPressed: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  platformName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#38bdf8',
  },
  chevron: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '700',
  },
  platformDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
