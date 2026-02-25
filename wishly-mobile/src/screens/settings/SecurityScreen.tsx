import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../../constants/design';
import { Card } from '../../components/ui/Card';
import { OutlineButton } from '../../components/ui/OutlineButton';
import { haptic } from '../../lib/haptics';
import { SecureStorage } from '../../lib/secureStorage';
import { useAuthStore } from '../../store/authStore';
import { isBiometricsAvailable, authenticateWithBiometrics } from '../../lib/biometrics';

export default function SecuritySettingsScreen() {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuthStore();

  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const available = await isBiometricsAvailable();
    setBiometricsAvailable(available);
    // Restore saved preference from user profile
    setBiometricsEnabled(!!user?.biometrics_enabled);
  };

  const handleBack = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [navigation]);

  const handleToggleBiometrics = useCallback(
    async (value: boolean) => {
      if (isToggling) return;
      setIsToggling(true);

      try {
        if (value) {
          // Verify identity before enabling
          const authenticated = await authenticateWithBiometrics();
          if (!authenticated) {
            haptic.error();
            setIsToggling(false);
            return;
          }
        }

        haptic.success();
        setBiometricsEnabled(value);
        await SecureStorage.setItem('biometrics_enabled', value ? 'true' : 'false');
        await updateProfile({ biometrics_enabled: value });
      } catch {
        haptic.error();
        // Revert on failure
        setBiometricsEnabled(!value);
        Alert.alert(
          '\u041E\u0448\u0438\u0431\u043A\u0430',
          '\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438',
        );
      } finally {
        setIsToggling(false);
      }
    },
    [isToggling, updateProfile],
  );

  const handleChangePassword = useCallback(() => {
    haptic.medium();
    Alert.alert(
      '\u0421\u043C\u0435\u043D\u0430 \u043F\u0430\u0440\u043E\u043B\u044F',
      '\u041D\u0430 \u0432\u0430\u0448\u0443 \u043F\u043E\u0447\u0442\u0443 \u0431\u0443\u0434\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0430 \u0441\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u0441\u043C\u0435\u043D\u044B \u043F\u0430\u0440\u043E\u043B\u044F',
      [
        { text: '\u041E\u0442\u043C\u0435\u043D\u0430', style: 'cancel' },
        {
          text: '\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C',
          onPress: async () => {
            haptic.success();
            // Future: call password reset endpoint
          },
        },
      ],
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{'\u0411\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C'}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Face ID / Biometrics Section */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>{'\uD83D\uDE0E'}</Text>
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Face ID</Text>
              <Text style={styles.sectionSubtitle}>
                {biometricsEnabled
                  ? '\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E'
                  : '\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E'}
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={handleToggleBiometrics}
              disabled={!biometricsAvailable || isToggling}
              trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.surfaceElevated}
            />
          </View>

          <View style={styles.sectionDivider} />

          <Text style={styles.descriptionText}>
            {biometricsAvailable
              ? '\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 Face ID \u0434\u043B\u044F \u0431\u044B\u0441\u0442\u0440\u043E\u0433\u043E \u0438 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0433\u043E \u0432\u0445\u043E\u0434\u0430 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435. \u0412\u0430\u0448\u0438 \u0431\u0438\u043E\u043C\u0435\u0442\u0440\u0438\u0447\u0435\u0441\u043A\u0438\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u0432\u0430\u0448\u0435\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435 \u0438 \u043D\u0438\u043A\u043E\u0433\u0434\u0430 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u044E\u0442\u0441\u044F \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440.'
              : '\u0411\u0438\u043E\u043C\u0435\u0442\u0440\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0430\u0443\u0442\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0446\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430 \u043D\u0430 \u044D\u0442\u043E\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 Face ID \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0445 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0430\u0445.'}
          </Text>

          <View style={styles.changePasswordContainer}>
            <OutlineButton
              title={'\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u0440\u043E\u043B\u044C'}
              onPress={handleChangePassword}
              color={colors.primary}
              style={styles.changePasswordButton}
            />
          </View>
        </Card>

        {/* Active Sessions Info */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionRow}>
            <View style={styles.sectionIconContainer}>
              <Text style={styles.sectionIcon}>{'\uD83D\uDCF1'}</Text>
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{'\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0441\u0435\u0441\u0441\u0438\u0438'}</Text>
              <Text style={styles.sectionSubtitle}>{'\u042D\u0442\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E'}</Text>
            </View>
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.sessionRow}>
            <View style={styles.sessionDot} />
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDevice}>iPhone ({'\u0442\u0435\u043A\u0443\u0449\u0435\u0435'})</Text>
              <Text style={styles.sessionLocation}>Wishly iOS</Text>
            </View>
            <Text style={styles.sessionActive}>{'\u0410\u043A\u0442\u0438\u0432\u043D\u043E'}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backArrow: {
    fontSize: 34,
    color: colors.textPrimary,
    fontWeight: '300',
    lineHeight: 38,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerRightPlaceholder: {
    width: 28,
  },

  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 40,
    gap: spacing.lg,
  },

  // Section Card
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIcon: {
    fontSize: 22,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: colors.separator,
    marginHorizontal: spacing.lg,
  },

  descriptionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    padding: spacing.lg,
  },

  // Change Password
  changePasswordContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  changePasswordButton: {
    borderColor: colors.primary,
  },

  // Sessions
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  sessionLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionActive: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
});
