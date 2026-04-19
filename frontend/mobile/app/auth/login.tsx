import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useZakatStore } from '../../store/zakatStore';
import { Button } from '../../components/ui';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, profile } = useZakatStore();

  async function handleLogin() {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace(profile.onboardingComplete ? '/tabs/overview' : '/onboarding/madhab');
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoRow}>
          <View style={styles.crescent} />
          <Text style={styles.logoText}>
            Zakat<Text style={{ color: Colors.green400 }}>Flow</Text>
          </Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.ink20}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={Colors.ink20}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label="Sign in" onPress={handleLogin} loading={loading} />

        <TouchableOpacity onPress={() => router.push('/auth/signup')}>
          <Text style={styles.signupLink}>
            No account yet?{' '}
            <Text style={{ color: Colors.green400 }}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingTop: 80 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 40 },
  crescent: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.green500 },
  logoText: { fontSize: 20, fontWeight: '600', color: Colors.ink },
  title: { fontSize: 26, fontWeight: '600', color: Colors.ink, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.ink60, marginBottom: 32 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: Colors.ink60, marginBottom: 5 },
  input: {
    borderWidth: 0.5, borderColor: Colors.ink10,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.ink,
  },
  errorText: {
    fontSize: 13, color: Colors.red600, marginBottom: 12, textAlign: 'center',
  },
  signupLink: {
    textAlign: 'center', fontSize: 13, color: Colors.ink60, marginTop: 16,
  },
});
