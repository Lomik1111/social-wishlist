import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useFriendStore } from '../../store/friendStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { haptic } from '../../lib/haptics';
import { colors, spacing, radius, typography } from '../../constants/design';
import { timeAgo } from '../../lib/utils';
import type { UserPublic, WishlistPublic } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------- FriendSearchCard ----------
const FriendSearchCard = React.memo(function FriendSearchCard({
  user,
  onAdd,
  isAdded,
}: {
  user: UserPublic;
  onAdd: (id: string) => void;
  isAdded: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAdd = useCallback(() => {
    if (isAdded) return;
    onAdd(user.id);
  }, [isAdded, onAdd, user.id]);

  return (
    <Card style={styles.searchCard}>
      <View style={styles.searchCardRow}>
        <View style={styles.avatarWrap}>
          <Avatar
            uri={user.avatar_url}
            name={user.full_name}
            size={48}
            showOnline
            isOnline={user.is_online}
          />
        </View>

        <View style={styles.searchCardInfo}>
          <Text style={styles.searchCardName} numberOfLines={1}>
            {user.full_name || 'Пользователь'}
          </Text>
          <Text style={styles.searchCardUsername} numberOfLines={1}>
            @{user.username || 'user'}
          </Text>
        </View>

        <AnimatedPressable
          style={[
            animatedStyle,
            styles.addButton,
            isAdded && styles.addButtonDone,
          ]}
          onPressIn={() => {
            scale.value = withSpring(0.92, { damping: 15 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 15 });
          }}
          onPress={handleAdd}
          disabled={isAdded}
        >
          <Text style={[styles.addButtonText, isAdded && styles.addButtonTextDone]}>
            {isAdded ? '✓' : 'Добавить'}
          </Text>
        </AnimatedPressable>
      </View>
    </Card>
  );
});

// ---------- WishlistPublicCard ----------
const WishlistPublicCard = React.memo(function WishlistPublicCard({
  wishlist,
  onPress,
}: {
  wishlist: WishlistPublic;
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => {
    haptic.light();
    onPress(wishlist.id);
  }, [wishlist.id, onPress]);

  return (
    <Pressable onPress={handlePress}>
      <Card style={styles.wishlistCard}>
        <View style={styles.wishlistCardRow}>
          <Avatar
            uri={wishlist.owner_avatar}
            name={wishlist.owner_name}
            size={40}
          />
          <View style={styles.wishlistCardInfo}>
            <Text style={styles.wishlistCardTitle} numberOfLines={1}>
              {wishlist.title}
            </Text>
            <Text style={styles.wishlistCardOwner} numberOfLines={1}>
              {wishlist.owner_name}
              {wishlist.occasion ? ` \u00b7 ${wishlist.occasion}` : ''}
            </Text>
          </View>
          <View style={styles.wishlistCardMeta}>
            <Text style={styles.wishlistCardCount}>
              {wishlist.item_count} {wishlist.item_count === 1 ? 'желание' : 'желаний'}
            </Text>
            {wishlist.event_date && (
              <Badge label={new Date(wishlist.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} variant="info" />
            )}
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

// ---------- Main Screen ----------
export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'search' | 'friends'>('search');
  const [query, setQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    searchResults,
    searchUsers,
    sendRequest,
    isLoading: friendsLoading,
    clearSearch,
  } = useFriendStore();

  const {
    friendsWishlists,
    fetchFriendsWishlists,
    isLoading: wishlistsLoading,
  } = useWishlistStore();

  // Fetch friends wishlists on tab switch
  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriendsWishlists();
    }
  }, [activeTab, fetchFriendsWishlists]);

  // Debounced search
  const handleSearchChange = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (text.length < 2) {
        clearSearch();
        return;
      }
      debounceRef.current = setTimeout(() => {
        searchUsers(text);
      }, 400);
    },
    [searchUsers, clearSearch],
  );

  const handleClearSearch = useCallback(() => {
    setQuery('');
    clearSearch();
  }, [clearSearch]);

  const handleAdd = useCallback(
    async (userId: string) => {
      try {
        await sendRequest(userId);
        haptic.success();
        setAddedIds((prev) => new Set(prev).add(userId));
      } catch {
        haptic.error();
        Alert.alert('Ошибка', 'Не удалось отправить запрос');
      }
    },
    [sendRequest],
  );

  const handleWishlistPress = useCallback(
    (id: string) => {
      router.push(`/wishlist/${id}`);
    },
    [navigation],
  );

  const handleTabSwitch = useCallback(
    (tab: 'search' | 'friends') => {
      haptic.selection();
      setActiveTab(tab);
    },
    [],
  );

  // ---------- Render helpers ----------
  const renderSearchItem = useCallback(
    ({ item }: { item: UserPublic }) => (
      <FriendSearchCard
        user={item}
        onAdd={handleAdd}
        isAdded={addedIds.has(item.id)}
      />
    ),
    [handleAdd, addedIds],
  );

  const renderWishlistItem = useCallback(
    ({ item }: { item: WishlistPublic }) => (
      <WishlistPublicCard wishlist={item} onPress={handleWishlistPress} />
    ),
    [handleWishlistPress],
  );

  const keyExtractorSearch = useCallback((item: UserPublic) => item.id, []);
  const keyExtractorWishlist = useCallback((item: WishlistPublic) => item.id, []);

  const SearchEmptyComponent = useCallback(
    () =>
      query.length >= 2 && !friendsLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Никого не найдено</Text>
          <Text style={styles.emptySubtitle}>
            Попробуйте другой запрос
          </Text>
        </View>
      ) : query.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>Найдите друзей</Text>
          <Text style={styles.emptySubtitle}>
            Введите имя или @username для поиска
          </Text>
        </View>
      ) : null,
    [query, friendsLoading],
  );

  const WishlistEmptyComponent = useCallback(
    () =>
      !wishlistsLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={styles.emptyTitle}>Пока пусто</Text>
          <Text style={styles.emptySubtitle}>
            Вишлисты ваших друзей появятся здесь
          </Text>
        </View>
      ) : null,
    [wishlistsLoading],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Поиск друзей</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Имя или @username..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClearSearch} hitSlop={8}>
              <Text style={styles.clearIcon}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => handleTabSwitch('search')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'search' && styles.tabTextActive,
            ]}
          >
            Поиск
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => handleTabSwitch('friends')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'friends' && styles.tabTextActive,
            ]}
          >
            Вишлисты друзей
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === 'search' ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchItem}
          keyExtractor={keyExtractorSearch}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={SearchEmptyComponent}
          ListHeaderComponent={
            friendsLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loader}
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={friendsWishlists}
          renderItem={renderWishlistItem}
          keyExtractor={keyExtractorWishlist}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={WishlistEmptyComponent}
          ListHeaderComponent={
            wishlistsLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.loader}
              />
            ) : null
          }
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },

  // Search
  searchContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.background,
    fontSize: 15,
    fontWeight: '400',
    padding: 0,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },

  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // List
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
    flexGrow: 1,
  },
  loader: {
    marginVertical: spacing.xl,
  },

  // Search card
  searchCard: {
    marginBottom: spacing.md,
  },
  searchCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: spacing.md,
  },
  searchCardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  searchCardName: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  searchCardUsername: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addButtonDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySubtle,
  },
  addButtonText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  addButtonTextDone: {
    color: colors.primary,
  },

  // Wishlist card
  wishlistCard: {
    marginBottom: spacing.md,
  },
  wishlistCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wishlistCardInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },
  wishlistCardTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  wishlistCardOwner: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wishlistCardMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  wishlistCardCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
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
  },
});
