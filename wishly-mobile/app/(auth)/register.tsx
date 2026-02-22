import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { haptic } from '../../lib/haptics';
import { colors, typography, spacing } from '../../constants/design';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
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

  const handleRegister = useCallback(async () => {
    clearError();
    haptic.medium();
    try {
      await register(email.trim(), password, fullName.trim(), username.trim());
      router.replace('/(tabs)');
    } catch {
      triggerShake();
      haptic.error();
    }
  }, [email, password, fullName, username]);

  const isFormValid = fullName.length > 0 && email.length > 0 && password.length > 0;

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
            <Text style={styles.title}>{'\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442'}</Text>
            <Text style={styles.subtitle}>{'\u041F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u044F\u0439\u0441\u044F \u043A \u0441\u043E\u043E\u0431\u0449\u0435\u0441\u0442\u0432\u0443'}</Text>
          </View>

          {/* Glass card */}
          <Animated.View style={[styles.glassCard, shakeStyle]}>
            <UnderlineInput
              label={'\u0418\u043C\u044F'}
              icon={'\uD83D\uDC64'}
              placeholder={'\u0412\u0430\u0448\u0435 \u0438\u043C\u044F'}
              value={fullName}
              onChangeText={(text: string) => {
                setFullName(text);
                clearError();
              }}
              autoCapitalize="words"
              autoComplete="name"
            />

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
              label={'\u0418\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F'}
              icon={'@'}
              placeholder="username"
              value={username}
              onChangeText={(text: string) => {
                setUsername(text);
                clearError();
              }}
              autoCapitalize="none"
              autoComplete="username"
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PillButton
              title={'\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442'}
              onPress={handleRegister}
              loading={isLoading}
              disabled={!isFormValid}
              style={styles.registerButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{'\u0418\u041B\u0418'}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google button */}
            <Pressable
              style={styles.googleButton}
              onPress={() => {
                haptic.medium();
                // Google Sign-In will be integrated later
              }}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>Google</Text>
            </Pressable>
          </Animated.View>

          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>{'\u0423\u0436\u0435 \u0435\u0441\u0442\u044C \u0430\u043A\u043A\u0430\u0443\u043D\u0442? '}</Text>
            <Pressable onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.bottomLink}>{'\u0412\u043E\u0439\u0442\u0438'}</Text>
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
    paddingVertical: spacing.xxxl,
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
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  registerButton: {
    marginTop: spacing.sm,
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
