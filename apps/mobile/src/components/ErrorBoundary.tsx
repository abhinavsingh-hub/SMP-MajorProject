import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('App rendering failed', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    const details = `${this.state.error.name}: ${this.state.error.message}\n${this.state.error.stack ?? ''}`;
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.title}>SocialParse needs to recover</Text>
          <Text style={styles.message}>An unexpected screen error occurred. Copy the details for your support or case record.</Text>
          <Pressable style={styles.button} onPress={() => Clipboard.setString(details)}>
            <Text style={styles.buttonText}>Copy error details</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090d16', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#0f172a', borderColor: '#334155', borderWidth: 1, borderRadius: 16, padding: 20, gap: 14 },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  message: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  button: { backgroundColor: '#0284c7', borderRadius: 10, padding: 13, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
});
