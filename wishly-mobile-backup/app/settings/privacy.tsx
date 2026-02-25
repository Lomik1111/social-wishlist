import React, { useState, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radius, typography } from '../../constants/design';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { haptic } from '../../lib/haptics';
import { useAuthStore } from '../../store/authStore';

type PrivacyLevel = 'friends' | 'private' | 'selected';

interface PrivacyOption {
  value: PrivacyLevel;
  label: string;
  icon: string;
  iconBg: string;
  description: string;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: 'friends',
    label: '\u0412\u0441\u0435 \u0434\u0440\u0443\u0437\u044C\u044F',
    icon: '\uD83D\uDC65',
    iconBg: 'rgba(0, 153, 255, 0.15)',
    description: '\u0412\u0441\u0435 \u0432\u0430\u0448\u0438 \u0434\u0440\u0443\u0437\u044C\u044F \u0443\u0432\u0438\u0434\u044F\u0442 \u0441\u043F\u0438\u0441\u043E\u043A',
  },
  {
    value: 'private',
    label: '\u0422\u043E\u043B\u044C\u043A\u043E \u044F',
    icon: '\uD83D\uDC64',
    iconBg: 'rgba(0, 214, 143, 0.15)',
    description: '\u0421\u043F\u0438\u0441\u043E\u043A \u0432\u0438\u0434\u0438\u0442\u0435 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u044B',
  },
  {
    value: 'selected',
    label: '\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0434\u0440\u0443\u0437\u044C\u044F',
    icon: '\u2B50',
    iconBg: 'rgba(246, 166, 35, 0.15)',
    description: '\u0422\u043E\u043B\u044C\u043A\u043E \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u0432\u0430\u043C\u0438 \u0434\u0440\u0443\u0437\u044C\u044F',
  },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();

  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('friends');
  const [showPrices, setShowPrices] = useState(true);
  const [anonymousReservations, setAnonymousReservations] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);

  const shareLink = `https://wishly.app/@${user?.username || 'user'}`;

  const handleBack = useCallback(() => {
    haptic.light();
    router.back();
  }, [router]);

  const handlePrivacyChange = useCallback((value: PrivacyLevel) => {
    haptic.selection();
    setPrivacyLevel(value);
  }, []);

  const handleToggleShowPrices = useCallback(
    async (value: boolean) => {
      haptic.selection();
      setShowPrices(value);
    },
    [],
  );

  const handleToggleAnonymous = useCallback(
    async (value: boolean) => {
      haptic.selection();
      setAnonymousReservations(value);
    },
    [],
  );

  const handleToggleNotifications = useCallback(
    async (value: boolean) => {
      haptic.selection();
      setNotificationsEnabled(value);
    },
    [],
  );

  const handleCopyLink = useCallback(async () => {
    haptic.success();
    await Clipboard.setStringAsync(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareLink]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{'\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u043E\u0441\u0442\u044C'}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Who Can See Section */}
        <SectionHeader title={'\u041A\u0422\u041E \u0412\u0418\u0414\u0418\u0422 \u0421\u041F\u0418\u0421\u041E\u041A'} />
        <Card style={styles.privacyCard}>
          {PRIVACY_OPTIONS.map((option, index) => {
            const isSelected = privacyLevel === option.value;
            const isLast = index === PRIVACY_OPTIONS.length - 1;

            return (
              <View key={option.value}>
                <Pressable
                  style={styles.radioRow}
                  onPress={() => handlePrivacyChange(option.value)}
                >
                  {/* Icon */}
                  <View style={[styles.optionIconContainer, { backgroundColor: option.iconBg }]}>
                    <Text style={styles.optionIcon}>{option.icon}</Text>
                  </View>

                  {/* Label */}
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                  </View>

                  {/* Radio */}
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
                {!isLast && <View style={styles.divider} />}
              </View>
            );
          })}
        </Card>

        {/* Caption */}
        <Text style={styles.caption}>
          {privacyLevel === 'friends'
            ? '\u0412\u0441\u0435 \u0432\u0430\u0448\u0438 \u0434\u0440\u0443\u0437\u044C\u044F \u0441\u043C\u043E\u0433\u0443\u0442 \u0432\u0438\u0434\u0435\u0442\u044C \u0432\u0430\u0448\u0438 \u0441\u043F\u0438\u0441\u043A\u0438 \u0438 \u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0434\u0430\u0440\u043A\u0438'
            : privacyLevel === 'private'
              ? '\u0421\u043F\u0438\u0441\u043A\u0438 \u0431\u0443\u0434\u0443\u0442 \u0441\u043A\u0440\u044B\u0442\u044B \u043E\u0442 \u0432\u0441\u0435\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u0435\u0439'
              : '\u0422\u043E\u043B\u044C\u043A\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0435 \u0432\u0430\u043C\u0438 \u0434\u0440\u0443\u0437\u044C\u044F \u0441\u043C\u043E\u0433\u0443\u0442 \u0432\u0438\u0434\u0435\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u0438'}
        </Text>

        {/* Toggles Section */}
        <View style={styles.togglesSection}>
          <Card style={styles.togglesCard}>
            {/* Show Prices */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>{'\uD83D\uDCB0'}</Text>
                <Text style={styles.toggleLabel}>{'\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0446\u0435\u043D\u044B'}</Text>
              </View>
              <Switch
                value={showPrices}
                onValueChange={handleToggleShowPrices}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.surfaceElevated}
              />
            </View>

            <View style={styles.divider} />

            {/* Anonymous Reservations */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>{'\uD83D\uDC41'}</Text>
                <Text style={styles.toggleLabel}>{'\u0410\u043D\u043E\u043D\u0438\u043C\u043D\u044B\u0435 \u0431\u0440\u043E\u043D\u0438'}</Text>
              </View>
              <Switch
                value={anonymousReservations}
                onValueChange={handleToggleAnonymous}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.surfaceElevated}
              />
            </View>

            <View style={styles.divider} />

            {/* Notifications */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleIcon}>{'\uD83D\uDD14'}</Text>
                <Text style={styles.toggleLabel}>{'\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F'}</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.surfaceElevated}
              />
            </View>
          </Card>
        </View>

        {/* Share Link Section */}
        <View style={styles.shareLinkSection}>
          <SectionHeader title={'\u041F\u041E\u0414\u0415\u041B\u0418\u0422\u042C\u0421\u042F \u041F\u041E \u0421\u0421\u042B\u041B\u041A\u0415'} />
          <Card style={styles.shareLinkCard}>
            <View style={styles.linkContainer}>
              <View style={styles.linkDisplay}>
                <Text style={styles.linkText} numberOfLines={1}>
                  {shareLink}
                </Text>
              </View>
              <Pressable
                style={[styles.copyButton, linkCopied && styles.copyButtonCopied]}
                onPress={handleCopyLink}
              >
                <Text
                  style={[styles.copyButtonText, linkCopied && styles.copyButtonTextCopied]}
                >
                  {linkCopied ? '\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D\u043E' : '\u0421\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.shareLinkCaption}>
              {'\u041B\u044E\u0431\u043E\u0439 \u0441 \u044D\u0442\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u0441\u043C\u043E\u0436\u0435\u0442 \u0432\u0438\u0434\u0435\u0442\u044C \u0432\u0430\u0448 \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 \u043F\u0440\u043E\u0444\u0438\u043B\u044C'}
            </Text>
          </Card>
        </View>
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
  },

  // Privacy Radio Card
  privacyCard: {
    padding: 0,
    overflow: 'hidden',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 18,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.info,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.info,
  },

  divider: {
    height: 1,
    backgroundColor: colors.separator,
    marginHorizontal: spacing.lg,
  },

  caption: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xs,
  },

  // Toggles
  togglesSection: {
    marginBottom: spacing.xxl,
  },
  togglesCard: {
    padding: 0,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  toggleIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  toggleLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // Share Link
  shareLinkSection: {
    marginBottom: spacing.xl,
  },
  shareLinkCard: {
    padding: spacing.lg,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkDisplay: {
    flex: 1,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  copyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  copyButtonCopied: {
    backgroundColor: colors.success,
  },
  copyButtonText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  copyButtonTextCopied: {
    color: '#FFFFFF',
  },
  shareLinkCaption: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
});
