import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Badge } from '../ui/Badge';
import { colors, spacing, radius } from '../../constants/design';
import { pluralize } from '../../lib/utils';
import { haptic } from '../../lib/haptics';

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

interface CompactCardProps {
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

export const CompactCard = memo(function CompactCard({ wishlist, onPress }: CompactCardProps) {
  const icon = OCCASION_ICONS[wishlist.occasion ?? 'other'] ?? '\uD83C\uDF81';
  const remaining = wishlist.item_count - wishlist.reserved_count;

  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.centerContent}>
        <Text style={styles.title} numberOfLines={1}>{wishlist.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {pluralize(wishlist.item_count, '\u043F\u043E\u0434\u0430\u0440\u043E\u043A', '\u043F\u043E\u0434\u0430\u0440\u043A\u0430', '\u043F\u043E\u0434\u0430\u0440\u043A\u043E\u0432')}
          {remaining > 0
            ? ` \u00B7 ${pluralize(remaining, '\u043E\u0441\u0442\u0430\u043B\u0441\u044F', '\u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C', '\u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C')}`
            : ' \u00B7 \u0432\u0441\u0435 \u0437\u0430\u0431\u0440\u043E\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u044B'}
        </Text>
      </View>
      <Badge
        label={wishlist.is_active ? '\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0439' : '\u0417\u0430\u0432\u0435\u0440\u0448\u0451\u043D'}
        variant={wishlist.is_active ? 'success' : 'default'}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  centerContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '400',
  },
});
