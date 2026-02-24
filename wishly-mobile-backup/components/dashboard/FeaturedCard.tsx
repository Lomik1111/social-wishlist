import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { colors, gradients, spacing, radius, typography } from '../../constants/design';
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

interface FeaturedCardProps {
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

export const FeaturedCard = memo(function FeaturedCard({ wishlist, onPress }: FeaturedCardProps) {
  const progress = wishlist.item_count > 0
    ? wishlist.reserved_count / wishlist.item_count
    : 0;
  const percentage = Math.round(progress * 100);
  const icon = OCCASION_ICONS[wishlist.occasion ?? 'other'] ?? '\uD83C\uDF81';

  const handlePress = useCallback(() => {
    haptic.light();
    onPress();
  }, [onPress]);

  const content = (
    <View style={styles.overlay}>
      <LinearGradient
        colors={gradients.featured}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topRow}>
        <Badge label="\u2B50 \u0418\u0437\u0431\u0440\u0430\u043D\u043D\u043E\u0435" variant="primary" />
        <Text style={styles.occasionIcon}>{icon}</Text>
      </View>
      <View style={styles.bottomContent}>
        <Text style={styles.title} numberOfLines={2}>{wishlist.title}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {wishlist.reserved_count}/{wishlist.item_count}{' '}
            {pluralize(wishlist.item_count, '\u043F\u043E\u0434\u0430\u0440\u043E\u043A', '\u043F\u043E\u0434\u0430\u0440\u043A\u0430', '\u043F\u043E\u0434\u0430\u0440\u043A\u043E\u0432')}
          </Text>
          <Text style={styles.percentText}>{percentage}%</Text>
        </View>
        <ProgressBar progress={progress} height={4} />
      </View>
    </View>
  );

  if (wishlist.cover_image_url) {
    return (
      <Pressable onPress={handlePress} style={styles.container}>
        <ImageBackground
          source={{ uri: wishlist.cover_image_url }}
          style={styles.background}
          imageStyle={styles.backgroundImage}
        >
          {content}
        </ImageBackground>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <LinearGradient
        colors={['#2D1B69', '#1A0533']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        {content}
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  background: {
    flex: 1,
    borderRadius: radius.xl,
  },
  backgroundImage: {
    borderRadius: radius.xl,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  occasionIcon: {
    fontSize: 28,
  },
  bottomContent: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  percentText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
