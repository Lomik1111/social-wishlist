import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';
import { authenticateWithBiometrics, isBiometricsAvailable } from '../lib/biometrics';

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        if (token) {
          const bioPref = await SecureStore.getItemAsync('biometrics_enabled');
          if (bioPref === 'true') {
            const available = await isBiometricsAvailable();
            if (available) {
              const authenticated = await authenticateWithBiometrics();
              if (!authenticated) {
                setReady(true);
                return; // Don't restore session — biometric failed
              }
            }
          }
        }
        await restoreSession();
      } catch {
        // Session restore failed, continue to login
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0A0F' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="wishlist/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="wishlist/[id]" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="friend/[username]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="settings/privacy" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings/theme" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings/security" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});
