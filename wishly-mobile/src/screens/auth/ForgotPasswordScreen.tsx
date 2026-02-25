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
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
} from 'react-native-reanimated';
import { UnderlineInput } from '../../components/ui/UnderlineInput';
import { PillButton } from '../../components/ui/PillButton';
import { useAuthStore } from '../../store/authStore';
import { haptic } from '../../lib/haptics';
import { colors, typography, spacing } from '../../constants/design';
type Step = 'email' | 'code';
export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const { forgotPassword, resetPassword, isLoading, error, clearError } = useAuthStore();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
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
  const handleSendCode = useCallback(async () => {
    clearError();
    haptic.medium();
    try {
      await forgotPassword(email.trim());
      setStep('code');
      haptic.success();
    } catch {
      triggerShake();
      haptic.error();
    }
  }, [email]);
  const handleResetPassword = useCallback(async () => {
    clearError();
    haptic.medium();
    try {
      await resetPassword(email.trim(), code.trim(), newPassword);
      setSuccess(true);
      haptic.success();
    } catch {
      triggerShake();
      haptic.error();
    }
  }, [email, code, newPassword]);
  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.heartCircle}>
            <Text style={styles.heartIcon}>{'\u2705'}</Text>
          </View>
          <Text style={styles.title}>{'Пароль изменён'}</Text>
          <Text style={styles.subtitle}>{'Теперь вы можете войти с новым паролем'}</Text>
          <PillButton
            title={'Войти'}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
            style={styles.successButton}
          />
        </View>
      </SafeAreaView>
    );
  }
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
              <Text style={styles.heartIcon}>{'\uD83D\uDD12'}</Text>
            </View>
            <Text style={styles.title}>
              {step === 'email' ? 'Сброс пароля' : 'Введите код'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Введите email для получения кода'
                : `Код отправлен на ${email}`}
            </Text>
          </View>
          {/* Glass card */}
          <Animated.View style={[styles.glassCard, shakeStyle]}>
            {step === 'email' ? (
              <>
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
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <PillButton
                  title={'Отправить код'}
                  onPress={handleSendCode}
                  loading={isLoading}
                  disabled={!email}
                  style={styles.actionButton}
                />
              </>
            ) : (
              <>
                <UnderlineInput
                  label={'Код из письма'}
                  icon={'#'}
                  placeholder="000000"
                  value={code}
                  onChangeText={(text: string) => {
                    setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                    clearError();
                  }}
                  keyboardType="number-pad"
                />
                <UnderlineInput
                  label={'Новый пароль'}
                  icon={'\uD83D\uDD12'}
                  placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  value={newPassword}
                  onChangeText={(text: string) => {
                    setNewPassword(text);
                    clearError();
                  }}
                  secureTextEntry={!showPassword}
                  rightIcon={showPassword ? '\uD83D\uDC41' : '\uD83D\uDC41\u200D\uD83D\uDDE8'}
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <PillButton
                  title={'Сменить пароль'}
                  onPress={handleResetPassword}
                  loading={isLoading}
                  disabled={code.length !== 6 || newPassword.length < 8}
                  style={styles.actionButton}
                />
                <Pressable
                  style={styles.resendRow}
                  onPress={() => {
                    clearError();
                    setStep('email');
                  }}
                >
                  <Text style={styles.resendText}>{'Отправить код повторно'}</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
          {/* Bottom link */}
          <View style={styles.bottomRow}>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.bottomLink}>{'Назад ко входу'}</Text>
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
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  successButton: {
    marginTop: spacing.xxl,
    width: '100%',
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
    textAlign: 'center',
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
  actionButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  resendRow: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
