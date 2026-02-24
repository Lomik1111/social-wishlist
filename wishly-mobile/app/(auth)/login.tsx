import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { UnderlineInput } from '../../components/ui/UnderlineInput';
import { PillButton } from '../../components/ui/PillButton';
import { useAuthStore } from '../../store/authStore';
import { useGoogleAuth } from '../../lib/googleAuth';
import { haptic } from '../../lib/haptics';
import { colors, typography, spacing } from '../../constants/design';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const shakeX = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleLogin = useCallback(async () => {
    clearError();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      Alert.alert('Ошибка', 'Пароль должен содержать от 8 до 128 символов');
      return;
    }
    haptic.medium();
    try {
      await login(trimmedEmail, password);
      router.replace('/(tabs)');
    } catch {
      triggerShake();
      haptic.error();
    }
  }, [email, password, login, clearError, router]);

  const { promptAsync, isReady: isGoogleReady } = useGoogleAuth(
    useCallback(async (idToken: string) => {
      clearError();
      try {
        await loginWithGoogle(idToken);
        router.replace('/(tabs)');
      } catch {
        triggerShake();
        haptic.error();
      }
    }, [loginWithGoogle, clearError, router])
  );

  const handleGoogleLogin = useCallback(async () => {
    haptic.medium();
    clearError();
    await promptAsync();
  }, [promptAsync]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.heartCircle}>
              <Text style={styles.heartIcon}>{'\u{1F497}'}</Text>
            </View>
            <Text style={styles.title}>Wishly</Text>
            <Text style={styles.subtitle}>{'Исполняй мечты вместе'}</Text>
          </View>

          {/* Glass card */}
          <Animated.View style={[styles.glassCard, shakeStyle]}>
            <UnderlineInput
              label="Email"
              icon={'\u2709\uFE0F'}
              placeholder="your@email.com"
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                clearError();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <UnderlineInput
              label={'\u041F\u0430\u0440\u043E\u043B\u044C'}
              icon={'\uD83D\uDD12'}
              placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
              value={password}
              onChangeText={(text: string) => {
                setPassword(text);
                clearError();
              }}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? '\uD83D\uDC41' : '\uD83D\uDC41\u200D\uD83D\uDDE8'}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <Pressable style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.forgotText}>{'\u0417\u0430\u0431\u044B\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C?'}</Text>
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PillButton
              title={'\u0412\u043E\u0439\u0442\u0438'}
              onPress={handleLogin}
              loading={isLoading}
              disabled={!email || !password}
              style={styles.loginButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{'\u0418\u041B\u0418'}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google button */}
            <Pressable style={styles.googleButton} onPress={handleGoogleLogin}>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Google</Text>
            </Pressable>
          </Animated.View>

          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>{'\u041D\u0435\u0442 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430? '}</Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.bottomLink}>{'\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044F'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  heartCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 45, 120, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heartIcon: { fontSize: 28 },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
    marginTop: -spacing.sm,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loginButton: {
    marginBottom: spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginHorizontal: spacing.lg,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  googleText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  bottomLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
