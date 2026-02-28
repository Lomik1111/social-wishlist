import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GradientView } from '../ui/GradientView';
import { ProgressBar } from '../ui/ProgressBar';
import { colors, spacing, radius } from '../../constants/design';
import { pluralize } from '../../lib/utils';
import { haptic } from '../../lib/haptics';
import { wishlistThemes } from '../../constants/design';

const OCCASION_ICONS: Record<string, string> = {
  birthday: '\uD83C\uDF82',
  new_year: '\uD83C\uDF84',
  wedding: '\uD83D\uDC8D',
  valentines: '\u2764\uFE0F',
  housewarming: '\uD83C\uDFE0',
  baby_shower: '\uD83D\uDC76',
  graduation: '\uD83C\uDF93',
  christmas: '\uD83C\uDF85',
  anniversary: '\uD83C\uDF89',
  other: '\uD83C\uDF81',
};

interface BentoCardProps {
  wishlist: {
    id: string;
    title: string;
    description: string | null;
    occasion: string | null;
    item_count: number;
    reserved_count: number;
    theme: string;
    cover_image_url: string | null;
    is_active: boolean;
    created_at: string;
  };
  onPress: () => void;
}

export const BentoCard = memo(function BentoCard({ wishlist, onPress }: BentoCardProps) {
  const progress = wishlist.item_count > 0
    ? wishlist.reserved_count / wishlist.item_count
    : 0;
  const icon = OCCASION_ICONS[wishlist.occasion ?? 'other'] ?? '\uD83C\uDF81';
  const themeConfig = wishlistThemes[wishlist.theme as keyof typeof wishlistThemes];
  const gradientColors = themeConfig
    ? (themeConfig.gradient as unknown as [string, string])
    : (['#1E1E2E', '#141420'] as [string, string]);

  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <GradientView
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <Text style={styles.count}>
          {pluralize(wishlist.item_count, '\u043F\u043E\u0434\u0430\u0440\u043E\u043A', '\u043F\u043E\u0434\u0430\u0440\u043A\u0430', '\u043F\u043E\u0434\u0430\u0440\u043A\u043E\u0432')}
        </Text>
        <Text style={styles.title} numberOfLines={2}>{wishlist.title}</Text>
        {wishlist.description ? (
          <Text style={styles.subtitle} numberOfLines={1}>{wishlist.description}</Text>
        ) : null}
        <View style={styles.progressWrapper}>
          <ProgressBar progress={progress} height={3} />
        </View>
      </GradientView>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 160,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-start',
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  icon: {
    fontSize: 20,
  },
  count: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
  progressWrapper: {
    marginTop: 'auto' as const,
    paddingTop: spacing.sm,
  },
});
