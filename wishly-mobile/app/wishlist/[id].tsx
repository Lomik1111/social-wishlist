import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';
import { ItemCard } from '../../components/wishlist/ItemCard';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import {
  colors,
  gradients,
  spacing,
  radius,
  typography,
  wishlistThemes,
} from '../../constants/design';
import { formatDate, pluralize } from '../../lib/utils';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList as new () => FlatList<Item>
);

type SortMode = 'default' | 'price_asc' | 'price_desc' | 'priority';

export default function WishlistDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const currentWishlist = useWishlistStore((s) => s.currentWishlist);
  const currentItems = useWishlistStore((s) => s.currentItems);
  const isLoading = useWishlistStore((s) => s.isLoading);
  const fetchWishlistById = useWishlistStore((s) => s.fetchWishlistById);
  const fetchWishlistItems = useWishlistStore((s) => s.fetchWishlistItems);

  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [menuVisible, setMenuVisible] = useState(false);

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HERO_HEIGHT - 100], [0, 1], Extrapolation.CLAMP),
  }));

  useEffect(() => {
    if (id) {
      fetchWishlistById(id);
      fetchWishlistItems(id);
    }
  }, [id, fetchWishlistById, fetchWishlistItems]);

  const handleRefresh = useCallback(async () => {
    if (!id) return;
    setRefreshing(true);
    await Promise.all([fetchWishlistById(id), fetchWishlistItems(id)]);
    setRefreshing(false);
  }, [id, fetchWishlistById, fetchWishlistItems]);

  const handleBack = useCallback(() => {
    haptic.light();
    router.back();
  }, [router]);

  const handleMenu = useCallback(() => {
    haptic.light();
    setMenuVisible((v) => !v);
  }, []);

  const handleItemPress = useCallback(
    (item: Item) => {
      router.push(`/item/${item.id}`);
    },
    [router]
  );

  const handleReserve = useCallback(
    (item: Item) => {
      Alert.alert(
        'Забронировать',
        `Вы хотите забронировать "${item.name}"?`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Да, забронировать',
            onPress: () => {
              haptic.success();
            },
          },
        ]
      );
    },
    []
  );

  const handleAddRecommendation = useCallback(() => {
    haptic.medium();
    if (currentWishlist) {
      router.push(`/wishlist/create?addToWishlist=${currentWishlist.id}`);
    }
  }, [router, currentWishlist]);

  const cycleSortMode = useCallback(() => {
    haptic.selection();
    setSortMode((current) => {
      const modes: SortMode[] = ['default', 'price_asc', 'price_desc', 'priority'];
      const idx = modes.indexOf(current);
      return modes[(idx + 1) % modes.length];
    });
  }, []);

  const sortedItems = useMemo(() => {
    const items = [...currentItems];
    switch (sortMode) {
      case 'price_asc':
        return items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      case 'price_desc':
        return items.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case 'priority': {
        const order = { must_have: 0, dream: 1, nice_to_have: 2, normal: 3 };
        return items.sort(
          (a, b) =>
            (order[a.priority as keyof typeof order] ?? 3) -
            (order[b.priority as keyof typeof order] ?? 3)
        );
      }
      default:
        return items.sort((a, b) => a.sort_order - b.sort_order);
    }
  }, [currentItems, sortMode]);

  const sortLabel = useMemo(() => {
    switch (sortMode) {
      case 'price_asc':
        return 'Цена: по возрастанию';
      case 'price_desc':
        return 'Цена: по убыванию';
      case 'priority':
        return 'По приоритету';
      default:
        return 'По умолчанию';
    }
  }, [sortMode]);

  const themeKey = currentWishlist?.theme as keyof typeof wishlistThemes | undefined;
  const theme = themeKey && wishlistThemes[themeKey] ? wishlistThemes[themeKey] : null;
  const heroGradient = theme ? theme.gradient : gradients.dark;

  const isOwner = currentWishlist?.owner_id === user?.id;

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ItemCard
        item={item}
        onPress={handleItemPress}
        onReserve={handleReserve}
        showPrices={currentWishlist?.show_prices ?? true}
      />
    ),
    [handleItemPress, handleReserve, currentWishlist?.show_prices]
  );

  const keyExtractor = useCallback((item: Item) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <View>
        {/* Hero section */}
        <View style={styles.hero}>
          {currentWishlist?.cover_image_url ? (
            <Image
              source={{ uri: currentWishlist.cover_image_url }}
              style={styles.heroCover}
              resizeMode="cover"
            />
          ) : null}
          <LinearGradient
            colors={
              currentWishlist?.cover_image_url
                ? (['transparent', 'rgba(0,0,0,0.85)'] as const)
                : (heroGradient as [string, string])
            }
            style={styles.heroOverlay}
          >
            {/* Top navigation row */}
            <View style={styles.heroTopRow}>
              <Pressable onPress={handleBack} style={styles.iconButton}>
                <Text style={styles.iconButtonText}>{'<'}</Text>
              </Pressable>
              <Pressable onPress={handleMenu} style={styles.iconButton}>
                <Text style={styles.iconButtonText}>{'...'}</Text>
              </Pressable>
            </View>

            {/* Badges */}
            <View style={styles.heroBadges}>
              <Badge
                label={pluralize(
                  currentWishlist?.item_count ?? 0,
                  'желание',
                  'желания',
                  'желаний'
                )}
                variant="default"
              />
              {(currentWishlist?.reserved_count ?? 0) > 0 && (
                <Badge
                  label={`${currentWishlist?.reserved_count} забронировано`}
                  variant="success"
                />
              )}
            </View>

            {/* Title */}
            <Text style={styles.heroTitle} numberOfLines={2}>
              {currentWishlist?.title ?? ''}
            </Text>

            {/* Date + avatars row */}
            <View style={styles.heroMeta}>
              {currentWishlist?.event_date && (
                <View style={styles.dateRow}>
                  <Text style={styles.dateIcon}>{'📅'}</Text>
                  <Text style={styles.dateText}>
                    {formatDate(currentWishlist.event_date)}
                  </Text>
                </View>
              )}
              {currentWishlist?.occasion && (
                <View style={styles.occasionBadge}>
                  <Text style={styles.occasionText}>
                    {currentWishlist.occasion}
                  </Text>
                </View>
              )}
            </View>

            {/* Avatars row (owner) */}
            <View style={styles.avatarRow}>
              <Avatar uri={user?.avatar_url} name={user?.full_name} size={28} />
              {isOwner && (
                <Text style={styles.ownerLabel}>{'Ваш вишлист'}</Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Sort bar */}
        <View style={styles.sortBar}>
          <Text style={styles.sectionTitle}>
            {'Желания'}
          </Text>
          <Pressable onPress={cycleSortMode} style={styles.sortButton}>
            <Text style={styles.sortButtonText}>{sortLabel}</Text>
            <Text style={styles.sortArrow}>{'↕'}</Text>
          </Pressable>
        </View>
      </View>
    ),
    [
      currentWishlist,
      heroGradient,
      handleBack,
      handleMenu,
      cycleSortMode,
      sortLabel,
      user,
      isOwner,
    ]
  );

  const ListFooter = useMemo(
    () => (
      <View style={styles.footer}>
        {/* Add recommendation card */}
        <Pressable onPress={handleAddRecommendation} style={styles.addCard}>
          <View style={styles.addCardInner}>
            <Text style={styles.addCardIcon}>{'+'}</Text>
            <Text style={styles.addCardTitle}>
              {isOwner ? 'Добавить желание' : 'Рекомендовать подарок'}
            </Text>
            <Text style={styles.addCardSubtitle}>
              {isOwner
                ? 'Добавьте новый подарок в список'
                : 'Предложите подарок владельцу'}
            </Text>
          </View>
        </Pressable>
        <View style={styles.bottomSpacer} />
      </View>
    ),
    [handleAddRecommendation, isOwner]
  );

  const ListEmpty = useMemo(
    () =>
      !isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'🎁'}</Text>
          <Text style={styles.emptyTitle}>{'Список пока пуст'}</Text>
          <Text style={styles.emptySubtitle}>
            {'Добавьте первое желание, чтобы начать'}
          </Text>
        </View>
      ) : null,
    [isLoading]
  );

  if (isLoading && !currentWishlist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Sticky header that appears on scroll */}
      <Animated.View style={[styles.stickyHeader, headerOpacity]}>
        <SafeAreaView edges={['top']} style={styles.stickyHeaderInner}>
          <View style={styles.stickyHeaderContent}>
            <Pressable onPress={handleBack} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>{'<'}</Text>
            </Pressable>
            <Text style={styles.stickyHeaderTitle} numberOfLines={1}>
              {currentWishlist?.title ?? ''}
            </Text>
            <Pressable onPress={handleMenu} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>{'...'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>

      <AnimatedFlatList
        data={sortedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {/* Menu overlay */}
      {menuVisible && (
        <Pressable style={styles.menuOverlay} onPress={handleMenu}>
          <View style={styles.menuContent}>
            {isOwner && (
              <>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    haptic.light();
                  }}
                >
                  <Text style={styles.menuItemText}>{'Редактировать'}</Text>
                </Pressable>
                <View style={styles.menuSeparator} />
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    haptic.light();
                  }}
                >
                  <Text style={styles.menuItemText}>{'Поделиться'}</Text>
                </Pressable>
                <View style={styles.menuSeparator} />
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    haptic.warning();
                  }}
                >
                  <Text style={[styles.menuItemText, { color: colors.danger }]}>
                    {'Удалить'}
                  </Text>
                </Pressable>
              </>
            )}
            {!isOwner && (
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  haptic.light();
                }}
              >
                <Text style={styles.menuItemText}>{'Поделиться'}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
  },

  // ---- Hero ----
  hero: {
    height: HERO_HEIGHT,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  heroCover: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heroTopRow: {
    position: 'absolute',
    top: 52,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  heroBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateIcon: {
    fontSize: 14,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  occasionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  occasionText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ownerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // ---- Sort bar ----
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  sortArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // ---- Sticky header ----
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stickyHeaderInner: {
    backgroundColor: colors.background,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stickyHeaderTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },

  // ---- Add card ----
  addCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  addCardInner: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  addCardIcon: {
    fontSize: 36,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    fontWeight: '300',
  },
  addCardTitle: {
    ...typography.h4,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  addCardSubtitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    textAlign: 'center',
  },

  // ---- Empty state ----
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  emptyIcon: {
    fontSize: 64,
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
  },

  // ---- Menu overlay ----
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: spacing.xl,
    zIndex: 200,
  },
  menuContent: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    minWidth: 200,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: colors.separator,
  },

  // ---- Footer ----
  footer: {},
  bottomSpacer: {
    height: spacing.huge,
  },
});
