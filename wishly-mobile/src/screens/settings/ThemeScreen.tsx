import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientView } from '../../components/ui/GradientView';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, typography, wishlistThemes } from '../../constants/design';
import { PillButton } from '../../components/ui/PillButton';
import { haptic } from '../../lib/haptics';
import { useAuthStore } from '../../store/authStore';

type ThemeKey = keyof typeof wishlistThemes;

interface ThemeItem {
  key: ThemeKey;
  name: string;
  description: string;
  gradient: readonly [string, string];
  accent: string;
  icon: string;
}

const THEME_LIST: ThemeItem[] = (Object.keys(wishlistThemes) as ThemeKey[]).map((key) => ({
  key,
  ...wishlistThemes[key],
}));

export default function ThemeSettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, updateProfile, isLoading } = useAuthStore();
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>(
    (user?.theme as ThemeKey) || 'deep_amethyst',
  );

  const handleBack = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [navigation]);

  const handleSelectTheme = useCallback((key: ThemeKey) => {
    haptic.selection();
    setSelectedTheme(key);
  }, []);

  const handleApply = useCallback(async () => {
    haptic.medium();
    try {
      await updateProfile({ theme: selectedTheme });
      haptic.success();
      navigation.goBack();
    } catch {
      haptic.error();
      Alert.alert('Ошибка', 'Не удалось применить тему. Проверьте подключение и попробуйте ещё раз.');
    }
  }, [selectedTheme, updateProfile, navigation]);

  const renderThemeCard = useCallback(
    ({ item }: { item: ThemeItem }) => {
      const isSelected = selectedTheme === item.key;

      return (
        <Pressable
          style={[
            styles.themeCard,
            isSelected && styles.themeCardSelected,
          ]}
          onPress={() => handleSelectTheme(item.key)}
        >
          {/* Gradient Preview */}
          <GradientView
            colors={item.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientPreview}
          >
            {/* Mini preview pill inside */}
            <View style={[styles.miniPreviewPill, { backgroundColor: item.accent }]}>
              <Text style={styles.miniPreviewText}>{item.icon} {'\u041F\u0440\u0435\u0432\u044C\u044E'}</Text>
            </View>

            {/* Checkmark if selected */}
            {isSelected && (
              <View style={styles.checkmarkContainer}>
                <View style={styles.checkmarkCircle}>
                  <Text style={styles.checkmarkIcon}>{'\u2713'}</Text>
                </View>
              </View>
            )}
          </GradientView>

          {/* Theme Info */}
          <View style={styles.themeInfo}>
            <View style={styles.themeNameRow}>
              <Text style={styles.themeIcon}>{item.icon}</Text>
              <Text style={styles.themeName}>{item.name}</Text>
            </View>
            <Text style={styles.themeDescription}>{item.description}</Text>
          </View>
        </Pressable>
      );
    },
    [selectedTheme, handleSelectTheme],
  );

  const keyExtractor = useCallback((item: ThemeItem) => item.key, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{'\u0412\u044B\u0431\u043E\u0440 \u0442\u0435\u043C\u044B'}</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {'\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0432\u0438\u0437\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u0438\u043B\u044C \u0434\u043B\u044F \u0432\u0430\u0448\u0438\u0445 \u0432\u0438\u0448\u043B\u0438\u0441\u0442\u043E\u0432'}
      </Text>

      {/* Theme List */}
      <FlatList
        data={THEME_LIST}
        renderItem={renderThemeCard}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Apply Button */}
      <View style={styles.bottomBar}>
        <PillButton
          title={'\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C'}
          onPress={handleApply}
          loading={isLoading}
          variant="white"
          style={styles.applyButton}
        />
      </View>
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

  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.lg,
  },

  // Theme Card
  themeCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  themeCardSelected: {
    borderColor: colors.info,
  },
  gradientPreview: {
    height: 140,
    borderTopLeftRadius: radius.lg - 2,
    borderTopRightRadius: radius.lg - 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  miniPreviewPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    opacity: 0.9,
  },
  miniPreviewText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Theme Info
  themeInfo: {
    padding: spacing.lg,
  },
  themeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  themeIcon: {
    fontSize: 18,
  },
  themeName: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  themeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // Bottom
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyButton: {
    width: '100%',
  },
});
