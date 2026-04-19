import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useZakatStore } from '../../store/zakatStore';
import { Button } from '../../components/ui';
import { Colors } from '../../constants/colors';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const signUp = useZakatStore((s) => s.signUp);

  async function handleSignup() {
    if (!name || !email || !password) return;
    setError('');
    setLoading(true);
    try {
      await signUp(name, email, password);
      router.replace('/onboarding/madhab');
    } catch (e: any) {
      setError(e.message ?? 'Sign up failed. Please try again.');
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

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Start calculating your Zakat with confidence
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ahmad Al-Rashid"
            placeholderTextColor={Colors.ink20}
            autoCapitalize="words"
          />
        </View>

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

        <Button
          label="Create account"
          onPress={handleSignup}
          loading={loading}
        />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
          <View style={[styles.socialIcon, { backgroundColor: Colors.green700 }]}>
            <Text style={styles.socialIconText}>G</Text>
          </View>
          <Text style={styles.socialBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
          <View style={[styles.socialIcon, { backgroundColor: Colors.ink80 }]}>
            <Text style={styles.socialIconText}>A</Text>
          </View>
          <Text style={styles.socialBtnText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/login')}>
          <Text style={styles.signinLink}>
            Already have an account?{' '}
            <Text style={{ color: Colors.green400 }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingTop: 60 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  crescent: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.green500,
    overflow: 'hidden',
  },
  logoText: { fontSize: 20, fontWeight: '600', color: Colors.ink },
  title: { fontSize: 26, fontWeight: '600', color: Colors.ink, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.ink60, marginBottom: 28, lineHeight: 20 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: Colors.ink60, marginBottom: 5 },
  input: {
    borderWidth: 0.5,
    borderColor: Colors.ink10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.ink,
    backgroundColor: Colors.white,
  },
  errorText: {
    fontSize: 13, color: Colors.red600, marginBottom: 12, textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginVertical: 18,
  },
  dividerLine: { flex: 1, height: 0.5, backgroundColor: Colors.ink10 },
  dividerText: { fontSize: 12, color: Colors.ink40 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 0.5, borderColor: Colors.ink10,
    borderRadius: 12, padding: 12,
    marginBottom: 10,
  },
  socialIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  socialIconText: { fontSize: 12, fontWeight: '600', color: Colors.white },
  socialBtnText: { fontSize: 14, color: Colors.ink },
  signinLink: {
    textAlign: 'center', fontSize: 13, color: Colors.ink60, marginTop: 16,
  },
});
