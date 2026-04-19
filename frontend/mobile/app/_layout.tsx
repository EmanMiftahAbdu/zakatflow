import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="onboarding/madhab" />
        <Stack.Screen name="onboarding/nisab" />
        <Stack.Screen name="onboarding/connect" />
        <Stack.Screen name="tabs" />
      </Stack>
    </>
  );
}
