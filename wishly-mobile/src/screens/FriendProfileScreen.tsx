import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radius, typography, gradients, wishlistThemes } from '../../constants/design';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { haptic } from '../../lib/haptics';
import { pluralize } from '../../lib/utils';
import api from '../../lib/api';
import { useFriendStore } from '../../store/friendStore';
import { useAuthStore } from '../../store/authStore';
import type { UserProfile, PublicWishlist, WishlistPublic } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.xl * 2 - CARD_GAP) / 2;

const OCCASION_EMOJIS: Record<string, string> = {
  birthday: '\uD83C\uDF82',
  new_year: '\uD83C\uDF84',
  wedding: '\uD83D\uDC8D',
  christmas: '\uD83C\uDF85',
  valentines: '\u2764\uFE0F',
  default: '\uD83C\uDF81',
};

export default function FriendProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {  username  } = route.params || {};
  useEffect(() => {
    if (!username || !/^[a-zA-Z0-9_]{3,50}$/.test(username)) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  }, [username]);
  const { friends, sendRequest, removeFriend } = useFriendStore();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wishlists, setWishlists] = useState<PublicWishlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get(`/users/search`, { params: { q: username } });
      const found = data.find((u: UserProfile) => u.username === username);
      if (found) {
        setProfile(found);
        // Check if already friends
        const friendMatch = friends.find(
          (f) => f.user?.id === found.id
        );
        setIsFriend(!!friendMatch);
      }
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    }
  }, [username, friends]);

  const fetchWishlists = useCallback(async () => {
    if (!username) return;
    try {
      const { data } = await api.get(`/wishlists/friends`);
      // Filter wishlists belonging to this user
      const userWishlists = data.filter(
        (w: WishlistPublic) => w.owner_username === username
      );
      setWishlists(userWishlists);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить списки');
    }
  }, [username]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchProfile(), fetchWishlists()]);
    setIsLoading(false);
  }, [fetchProfile, fetchWishlists]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchWishlists()]);
    setRefreshing(false);
  }, [fetchProfile, fetchWishlists]);

  const handleBack = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [navigation]);

  const handleToggleFriend = useCallback(async () => {
    if (!profile) return;
    haptic.medium();
    try {
      if (isFriend) {
        await removeFriend(profile.id);
        setIsFriend(false);
      } else {
        await sendRequest(profile.id);
        setRequestSent(true);
      }
    } catch {
      haptic.error();
      Alert.alert('Ошибка', 'Не удалось выполнить действие');
    }
  }, [profile, isFriend, removeFriend, sendRequest]);

  const handleOpenWishlist = useCallback(
    (wishlistId: string) => {
      haptic.light();
      router.push(`/wishlist/${wishlistId}`);
    },
    [navigation],
  );

  const handleMore = useCallback(() => {
    haptic.light();
    // Future: show action sheet
  }, []);

  const getThemeGradient = (themeKey: string): readonly [string, string] => {
    const theme = wishlistThemes[themeKey as keyof typeof wishlistThemes];
    return theme ? theme.gradient : gradients.card;
  };

  const getEmojiGrid = (wishlist: PublicWishlist): string[] => {
    const emojis = ['\uD83C\uDF81', '\uD83D\uDC9C', '\u2B50', '\uD83C\uDF1F'];
    return emojis.slice(0, 4);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Text style={styles.backArrow}>{'\u2039'}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{'\u041F\u0420\u041E\u0424\u0418\u041B\u042C'}</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'\uD83D\uDE14'}</Text>
          <Text style={styles.emptyTitle}>{'\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D'}</Text>
          <Text style={styles.emptySubtitle}>
            {'\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0438\u043C\u044F \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044F \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statsData = [
    { label: '\u0421\u041F\u0418\u0421\u041A\u041E\u0412', value: wishlists.length },
    { label: '\u041F\u041E\u0414\u0410\u0420\u041A\u041E\u0412', value: wishlists.reduce((sum, w) => sum + w.item_count, 0) },
    { label: '\u0414\u0420\u0423\u0417\u0415\u0419', value: profile.friends_count ?? 0 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header / Navbar */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Text style={styles.backArrow}>{'\u2039'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{'\u041F\u0420\u041E\u0424\u0418\u041B\u042C'}</Text>
        <Pressable onPress={handleMore} hitSlop={12}>
          <Text style={styles.moreButton}>{'\u22EF'}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* Avatar with gradient border */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradientBorder}
            >
              <View style={styles.avatarInner}>
                <Avatar
                  uri={profile.avatar_url}
                  name={profile.full_name}
                  size={72}
                />
              </View>
            </LinearGradient>
            {profile.is_online && <View style={styles.onlineDot} />}
          </View>

          {/* Name & Username */}
          <Text style={styles.profileName}>{profile.full_name || '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C'}</Text>
          <Text style={styles.profileUsername}>@{profile.username || 'user'}</Text>

          {/* Bio */}
          {profile.bio ? (
            <Text style={styles.profileBio}>{profile.bio}</Text>
          ) : null}

          {/* Friend Button */}
          {isFriend ? (
            <Pressable style={styles.friendButton} onPress={handleToggleFriend}>
              <Text style={styles.friendButtonIcon}>{'\u2713'}</Text>
              <Text style={styles.friendButtonText}>{'\u0412\u044B \u043F\u043E\u0434\u043F\u0438\u0441\u0430\u043D\u044B'}</Text>
            </Pressable>
          ) : requestSent ? (
            <Pressable style={styles.requestSentButton} disabled>
              <Text style={styles.requestSentText}>{'\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D'}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.addFriendButton} onPress={handleToggleFriend}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addFriendGradient}
              >
                <Text style={styles.addFriendText}>{'\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432 \u0434\u0440\u0443\u0437\u044C\u044F'}</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {statsData.map((stat, index) => (
            <Card key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        {/* Public Wishlists Section */}
        <View style={styles.wishlistsSection}>
          <SectionHeader
            title={`\u041F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0435 \u0441\u043F\u0438\u0441\u043A\u0438 \u00B7 ${wishlists.length}`}
          />

          <View style={styles.wishlistsGrid}>
            {wishlists.map((wishlist) => {
              const themeGradient = getThemeGradient(wishlist.theme);
              const emojis = getEmojiGrid(wishlist);

              return (
                <Pressable
                  key={wishlist.id}
                  style={styles.wishlistCard}
                  onPress={() => handleOpenWishlist(wishlist.id)}
                >
                  <LinearGradient
                    colors={themeGradient}
                    style={styles.wishlistCardGradient}
                  >
                    {/* Emoji Grid 2x2 */}
                    <View style={styles.emojiGrid}>
                      <View style={styles.emojiRow}>
                        <Text style={styles.emojiItem}>{emojis[0]}</Text>
                        <Text style={styles.emojiItem}>{emojis[1]}</Text>
                      </View>
                      <View style={styles.emojiRow}>
                        <Text style={styles.emojiItem}>{emojis[2]}</Text>
                        <Text style={styles.emojiItem}>{emojis[3]}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                  <Text style={styles.wishlistTitle} numberOfLines={1}>
                    {wishlist.title}
                  </Text>
                  <Text style={styles.wishlistCount}>
                    {pluralize(
                      wishlist.item_count,
                      '\u043F\u043E\u0434\u0430\u0440\u043E\u043A',
                      '\u043F\u043E\u0434\u0430\u0440\u043A\u0430',
                      '\u043F\u043E\u0434\u0430\u0440\u043A\u043E\u0432',
                    )}
                  </Text>
                </Pressable>
              );
            })}

            {/* Suggest List Card */}
            <Pressable style={styles.suggestCard}>
              <View style={styles.suggestCardInner}>
                <Text style={styles.suggestIcon}>{'\u002B'}</Text>
                <Text style={styles.suggestText}>{'\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0438\u0442\u044C\n\u0441\u043F\u0438\u0441\u043E\u043A'}</Text>
              </View>
            </Pressable>
          </View>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    ...typography.label,
    color: colors.textPrimary,
    fontSize: 13,
    letterSpacing: 1.5,
  },
  moreButton: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerRightPlaceholder: {
    width: 28,
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatarGradientBorder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  avatarInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.background,
  },
  profileName: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  profileUsername: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  profileBio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xxxl,
  },

  // Friend Button
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 153, 255, 0.15)',
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  friendButtonIcon: {
    fontSize: 14,
    color: colors.info,
    fontWeight: '700',
  },
  friendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.info,
  },

  requestSentButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestSentText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  addFriendButton: {
    marginTop: spacing.xl,
  },
  addFriendGradient: {
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  addFriendText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    gap: CARD_GAP,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Wishlists
  wishlistsSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
  },
  wishlistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  wishlistCard: {
    width: CARD_WIDTH,
    marginBottom: spacing.sm,
  },
  wishlistCardGradient: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiGrid: {
    gap: spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emojiItem: {
    fontSize: 28,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  wishlistTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  wishlistCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Suggest Card
  suggestCard: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.sm,
  },
  suggestCardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  suggestIcon: {
    fontSize: 28,
    color: colors.textTertiary,
    fontWeight: '300',
  },
  suggestText: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
