import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useZakatStore } from '../store/zakatStore';
import { Colors } from '../constants/colors';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const { isLoggedIn, profile, setSession } = useZakatStore();

  useEffect(() => {
    const timeout = setTimeout(() => setChecking(false), 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setChecking(false);
      clearTimeout(timeout);
    }).catch(() => {
      setChecking(false);
      clearTimeout(timeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator color={Colors.green500} />
      </View>
    );
  }

  if (!isLoggedIn) return <Redirect href="/auth/signup" />;
  if (!profile.onboardingComplete) return <Redirect href="/onboarding/madhab" />;
  return <Redirect href="/tabs/overview" />;
}
