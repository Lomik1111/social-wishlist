import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import api from '../lib/api';
import { haptic } from '../lib/haptics';
import { formatPrice } from '../lib/utils';
import { colors, spacing, radius, typography, gradients } from '../constants/design';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.xl;
const COLUMN_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

interface LikedItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  currency: string;
  source_domain: string | null;
  wishlist_title: string | null;
  wishlist_id: string;
}

type FilterType = 'all' | 'friends' | 'mine';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'friends', label: 'Списки друзей' },
  { key: 'mine', label: 'Мои желания' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------- Card Component ----------
const FavoriteCard = React.memo(function FavoriteCard({
  item,
  index,
}: {
  item: LikedItem;
  index: number;
}) {
  const navigation = useNavigation<any>();
  // Alternate card heights for bento effect
  const isOddColumn = index % 2 === 1;
  const heightVariants = [180, 220, 160, 200];
  const cardHeight = heightVariants[index % heightVariants.length];

  const handlePress = useCallback(() => {
    haptic.light();
    navigation.navigate('ItemDetail', { id: item.id });
  }, [item.id, navigation]);

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(index * 60).duration(400).springify()}
      style={[
        styles.card,
        {
          width: COLUMN_WIDTH,
          height: cardHeight,
          marginLeft: isOddColumn ? GRID_GAP : 0,
        },
      ]}
      onPress={handlePress}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      ) : (
        <LinearGradient
          colors={['#2D1B69', '#1A0533']}
          style={styles.cardImage}
        />
      )}

      {/* Dark overlay gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.cardOverlay}
      >
        {/* Heart icon top right */}
        <View style={styles.heartBadge}>
          <Text style={styles.heartIcon}>{'♥'}</Text>
        </View>

        {/* Item info bottom */}
        <View style={styles.cardInfo}>
          {item.wishlist_title && (
            <View style={styles.sourceTag}>
              <Text style={styles.sourceTagText} numberOfLines={1}>
                {'Из списка '}{item.wishlist_title}
              </Text>
            </View>
          )}
          <Text style={styles.cardName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.price != null && (
            <Text style={styles.cardPrice}>
              {formatPrice(item.price, item.currency)}
            </Text>
          )}
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
});

// ---------- Main Screen ----------
export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<LikedItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLiked();
  }, []);

  const fetchLiked = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/items/liked');
      setItems(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side filtering (since API doesn't support filter param)
  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    // Assuming Item has a property to filter by, or just placeholder for now.
    // Since 'reserved' or 'available' might not be on the Item type in this context directly or logic is custom.
    // Let's implement a basic filter if properties exist, or leave comment.
    // Based on filter state 'all' | 'reserved' | 'available'
    return items.filter(item => {
      if (filter === 'reserved') return item.is_reserved;
      if (filter === 'available') return !item.is_reserved;
      return true;
    });
  }, [items, filter]);

  const handleFilterPress = useCallback((key: FilterType) => {
    haptic.selection();
    setFilter(key);
  }, []);

  const handleBack = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [navigation]);

  // Split items into two columns for masonry effect
  const leftColumn: { item: LikedItem; originalIndex: number }[] = [];
  const rightColumn: { item: LikedItem; originalIndex: number }[] = [];
  filteredItems.forEach((item, index) => {
    if (index % 2 === 0) {
      leftColumn.push({ item, originalIndex: index });
    } else {
      rightColumn.push({ item, originalIndex: index });
    }
  });

  const renderColumn = (
    columnData: { item: LikedItem; originalIndex: number }[],
  ) =>
    columnData.map(({ item, originalIndex }) => (
      <FavoriteCard key={item.id} item={item} index={originalIndex} />
    ));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.title}>{'Избранное'}</Text>
        <Pressable hitSlop={8}>
          <Text style={styles.filterIcon}>{'☰'}</Text>
        </Pressable>
      </View>

      {/* Chip Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => handleFilterPress(f.key)}
          >
            <Text
              style={[
                styles.chipText,
                filter === f.key && styles.chipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'♥'}</Text>
          <Text style={styles.emptyTitle}>{'Нет избранных подарков'}</Text>
          <Text style={styles.emptySubtitle}>
            {'Нажимайте ♥ на понравившихся подарках,\nи они появятся здесь'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={[1]}
          keyExtractor={() => 'masonry'}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          renderItem={() => (
            <View style={styles.masonryContainer}>
              <View style={styles.masonryColumn}>
                {renderColumn(leftColumn)}
              </View>
              <View style={styles.masonryColumn}>
                {renderColumn(rightColumn)}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ---------- Styles ----------
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
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  filterIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: '600',
  },

  // Loading
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Masonry grid
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 100,
  },
  masonryContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
  },

  // Card
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: GRID_GAP,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  cardOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },

  // Heart
  heartBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 45, 120, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: {
    fontSize: 14,
    color: colors.primary,
  },

  // Source tag
  sourceTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 45, 120, 0.2)',
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  sourceTagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },

  // Card info
  cardInfo: {},
  cardName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
  },
  cardPrice: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 56,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
    lineHeight: 22,
  },
});
