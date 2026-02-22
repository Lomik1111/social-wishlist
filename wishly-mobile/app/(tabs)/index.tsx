import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useNotificationStore } from '../../store/notificationStore';
import { FeaturedCard } from '../../components/dashboard/FeaturedCard';
import { BentoCard } from '../../components/dashboard/BentoCard';
import { CompactCard } from '../../components/dashboard/CompactCard';
import { CreateCard } from '../../components/dashboard/CreateCard';
import { haptic } from '../../lib/haptics';
import { colors, typography, spacing } from '../../constants/design';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { wishlists, fetchWishlists, isLoading } = useWishlistStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const fabScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    fetchWishlists();
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleFabPress = useCallback(() => {
    haptic.heavy();
    fabScale.value = withSpring(0.9, { damping: 15 });
    setTimeout(() => {
      fabScale.value = withSpring(1.1, { damping: 10 });
      setTimeout(() => {
        fabScale.value = withSpring(1, { damping: 15 });
        router.push('/wishlist/create');
      }, 100);
    }, 100);
  }, []);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWishlists();
    setRefreshing(false);
  }, []);

  const handleProfilePress = useCallback(() => {
    router.push('/(tabs)/profile');
  }, []);

  const handleNotificationsPress = useCallback(() => {
    haptic.light();
    router.push('/notifications');
  }, []);

  const handleCreatePress = useCallback(() => {
    haptic.medium();
    router.push('/wishlist/create');
  }, []);

  const featured = wishlists[0];
  const middle = wishlists.slice(1, 3);
  const compact = wishlists[3];
  const extra = wishlists.slice(4, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleProfilePress}>
            <Avatar uri={user?.avatar_url} name={user?.full_name} size={44} />
          </Pressable>
          <Text style={styles.headerLabel}>WISHLIST</Text>
          <Pressable onPress={handleNotificationsPress} style={styles.bellWrapper}>
            <Text style={styles.bellIcon}>{'\uD83D\uDD14'}</Text>
            {unreadCount > 0 && <View style={styles.bellDot} />}
          </Pressable>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroMy}>{'\u041C\u043E\u0438 '}</Text>
            <Text style={styles.heroWishlists}>Wishlists</Text>
          </View>
          <Text style={styles.heroSubtitle}>
            {'\u041E\u0440\u0433\u0430\u043D\u0438\u0437\u0443\u0439 \u0441\u0432\u043E\u0438 \u043C\u0435\u0447\u0442\u044B'}
          </Text>
        </View>

        {/* Featured Card */}
        {featured && (
          <FeaturedCard
            wishlist={featured}
            onPress={() => {
              haptic.light();
              router.push(`/wishlist/${featured.id}`);
            }}
          />
        )}

        {/* Middle row: 2 bento cards */}
        {middle.length > 0 && (
          <View style={styles.bentoRow}>
            {middle.map((w) => (
              <BentoCard
                key={w.id}
                wishlist={w}
                onPress={() => {
                  router.push(`/wishlist/${w.id}`);
                }}
              />
            ))}
          </View>
        )}

        {/* Compact card */}
        {compact && (
          <CompactCard
            wishlist={compact}
            onPress={() => {
              router.push(`/wishlist/${compact.id}`);
            }}
          />
        )}

        {/* Bottom row: extra cards + create */}
        <View style={styles.bentoRow}>
          {extra.map((w) => (
            <BentoCard
              key={w.id}
              wishlist={w}
              onPress={() => {
                router.push(`/wishlist/${w.id}`);
              }}
            />
          ))}
          <CreateCard onPress={handleCreatePress} />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabContainer}>
        <Animated.View style={[styles.fabGlow, glowAnimatedStyle]} />
        <AnimatedPressable
          style={[styles.fab, fabAnimatedStyle]}
          onPress={handleFabPress}
        >
          <Text style={styles.fabIcon}>+</Text>
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 160,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
    marginTop: spacing.sm,
  },
  headerLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
  },
  bellWrapper: {
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
  },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  hero: {
    marginBottom: spacing.xxl,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  heroMy: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  heroWishlists: {
    ...typography.h1,
    color: colors.primary,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: 80,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 45, 120, 0.35)',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: '300',
    color: '#0A0A0F',
    marginTop: -2,
  },
});
