import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import type { Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { haptic } from '../../lib/haptics';
import { colors, spacing, radius, typography, gradients } from '../../constants/design';

// ---------- SettingRow ----------
const SettingRow = React.memo(function SettingRow({
  icon,
  title,
  rightValue,
  showChevron = true,
  onPress,
  isToggle = false,
  toggleValue = false,
  onToggle,
  danger = false,
}: {
  icon: string;
  title: string;
  rightValue?: string;
  showChevron?: boolean;
  onPress?: () => void;
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  danger?: boolean;
}) {
  const handlePress = useCallback(() => {
    haptic.light();
    onPress?.();
  }, [onPress]);

  const handleToggle = useCallback(
    (val: boolean) => {
      haptic.selection();
      onToggle?.(val);
    },
    [onToggle],
  );

  return (
    <Pressable
      style={styles.settingRow}
      onPress={isToggle ? undefined : handlePress}
      disabled={isToggle}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text
        style={[styles.settingTitle, danger && styles.settingTitleDanger]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={styles.settingRight}>
        {rightValue && !isToggle && (
          <Text style={styles.settingValue}>{rightValue}</Text>
        )}
        {isToggle && onToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={handleToggle}
            trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        ) : showChevron ? (
          <Text style={styles.chevron}>›</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

// ---------- Section ----------
const SettingsSection = React.memo(function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
});

// ---------- Main Screen ----------
export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = useCallback(() => {
    haptic.warning();
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  }, [logout, router]);

  const navigateTo = useCallback(
    (path: string) => {
      haptic.light();
      router.push(path as Href);
    },
    [router],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Avatar with gradient border */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradientBorder}
            >
              <View style={styles.avatarInner}>
                <Avatar
                  uri={user?.avatar_url}
                  name={user?.full_name}
                  size={76}
                />
              </View>
            </LinearGradient>
            <Pressable
              style={styles.editAvatarButton}
              onPress={() => navigateTo('/settings/privacy')}
            >
              <Text style={styles.editAvatarIcon}>✏️</Text>
            </Pressable>
          </View>

          {/* Name + username */}
          <Text style={styles.profileName}>
            {user?.full_name || 'Пользователь'}
          </Text>
          <Text style={styles.profileUsername}>
            @{user?.username || 'user'}
          </Text>

          {/* Premium badge */}
          {user?.is_premium && (
            <View style={styles.premiumBadgeWrap}>
              <Badge label="PREMIUM" variant="primary" />
            </View>
          )}
        </View>

        {/* АККАУНТ Section */}
        <SettingsSection title="АККАУНТ">
          <SettingRow
            icon="👤"
            title="Личные данные"
            onPress={() => navigateTo('/settings/privacy')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="📋"
            title="Мои Списки"
            onPress={() => navigateTo('/(tabs)')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="📦"
            title="Архив желаний"
            onPress={() => navigateTo('/favorites')}
          />
        </SettingsSection>

        {/* НАСТРОЙКИ Section */}
        <SettingsSection title="НАСТРОЙКИ">
          <SettingRow
            icon="🔔"
            title="Уведомления"
            onPress={() => navigateTo('/notifications')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="🔒"
            title="Приватность"
            onPress={() => navigateTo('/settings/privacy')}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="🎨"
            title="Тема оформления"
            onPress={() => navigateTo('/settings/theme')}
          />
        </SettingsSection>

        {/* ПРИЛОЖЕНИЕ Section */}
        <SettingsSection title="ПРИЛОЖЕНИЕ">
          <SettingRow
            icon="❓"
            title="Помощь"
            onPress={() => {}}
          />
          <View style={styles.separator} />
          <SettingRow
            icon="ℹ️"
            title="О приложении"
            rightValue="1.0.0"
            onPress={() => {}}
          />
        </SettingsSection>

        {/* Logout button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerVersion}>Версия 1.0.0 (1)</Text>
          <Text style={styles.footerCompany}>Wishly Inc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatarGradientBorder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarIcon: {
    fontSize: 12,
  },
  profileName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileUsername: {
    ...typography.body,
    color: colors.textSecondary,
  },
  premiumBadgeWrap: {
    marginTop: spacing.md,
  },

  // Section
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 28,
    textAlign: 'center',
  },
  settingTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  settingTitleDanger: {
    color: colors.danger,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: 22,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  separator: {
    height: 1,
    backgroundColor: colors.separator,
    marginLeft: 56,
  },

  // Logout
  logoutButton: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.dangerBg,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoutText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xxxl,
    gap: 4,
  },
  footerVersion: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  footerCompany: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
