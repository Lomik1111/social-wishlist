import React, { memo, useCallback } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import { colors, spacing, radius, typography } from '../../constants/design';
import { formatPrice } from '../../lib/utils';
import { haptic } from '../../lib/haptics';
type Item = {
  id: string;
  wishlist_id: string;
  name: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  source_domain: string | null;
  is_group_gift: boolean;
  priority: string;
  sort_order: number;
  is_liked_by_owner: boolean;
  like_count: number;
  is_reserved: boolean;
  reservation_count: number;
  contribution_total: number;
  contribution_count: number;
  progress_percentage: number;
  created_at: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ItemCardProps {
  item: Item;
  onPress: (item: Item) => void;
  onReserve: (item: Item) => void;
  showPrices?: boolean;
}

function ItemCardComponent({ item, onPress, onReserve, showPrices = true }: ItemCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, [scale]);

  const handlePress = useCallback(() => {
    haptic.light();
    onPress(item);
  }, [item, onPress]);

  const handleReserve = useCallback(() => {
    haptic.medium();
    onReserve(item);
  }, [item, onReserve]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, styles.card]}
    >
      {/* Status badge */}
      <View style={styles.badgeRow}>
        {item.is_reserved ? (
          <Badge label="Забронировано" variant="warning" />
        ) : (
          <Badge label="Доступно" variant="success" />
        )}
        {item.is_group_gift && (
          <Badge label="Групповой" variant="info" />
        )}
        {item.priority === 'must_have' && (
          <Badge label="Must have" variant="primary" />
        )}
      </View>

      {/* Product image */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[colors.surfaceElevated, colors.surface]}
          style={styles.imagePlaceholder}
        >
          <Text style={styles.imagePlaceholderIcon}>{'🎁'}</Text>
        </LinearGradient>
      )}

      {/* Item info */}
      <View style={styles.infoSection}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>

        {showPrices && item.price !== null && (
          <Text style={styles.itemPrice}>
            {formatPrice(item.price, item.currency)}
          </Text>
        )}

        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {item.source_domain && (
          <Text style={styles.sourceDomain}>{item.source_domain}</Text>
        )}

        {/* Group gift progress */}
        {item.is_group_gift && item.progress_percentage > 0 && (
          <View style={styles.progressSection}>
            <ProgressBar progress={item.progress_percentage / 100} />
            <Text style={styles.progressText}>
              {formatPrice(item.contribution_total, item.currency)} / {formatPrice(item.price, item.currency)}
            </Text>
          </View>
        )}
      </View>

      {/* Reserve button */}
      {!item.is_reserved && (
        <Pressable onPress={handleReserve} style={styles.reserveButton}>
          <LinearGradient
            colors={['#FF2D78', '#FF6B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.reserveGradient}
          >
            <Text style={styles.reserveText}>
              {item.is_group_gift ? 'Участвовать' : 'Забронировать'}
            </Text>
          </LinearGradient>
        </Pressable>
      )}

      {item.is_reserved && (
        <View style={styles.reservedIndicator}>
          <Text style={styles.reservedText}>Уже забронировано</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export const ItemCard = memo(ItemCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 48,
  },
  infoSection: {
    padding: spacing.lg,
  },
  itemName: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  itemDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sourceDomain: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  progressSection: {
    marginTop: spacing.sm,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  reserveButton: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  reserveGradient: {
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  reservedIndicator: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  reservedText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
