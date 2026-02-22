import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    restoreSession();
  }, []);

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
