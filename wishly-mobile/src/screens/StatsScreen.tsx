import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { GradientView } from '../components/ui/GradientView';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import api from '../lib/api';
import { haptic } from '../lib/haptics';
import { formatPrice, pluralize, getInitials } from '../lib/utils';
import { Avatar } from '../components/ui/Avatar';
import { SectionHeader } from '../components/ui/SectionHeader';
import { colors, spacing, radius, typography, gradients } from '../constants/design';

// ---------- Types ----------
interface MonthlyActivity {
  month: string;
  count: number;
}

interface TopGiver {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  count: number;
}

interface StatsData {
  total_gifts: number;
  reserved_count: number;
  top_category: string | null;
  avg_price: number;
  monthly_activity: MonthlyActivity[];
  top_givers: TopGiver[];
}

// ---------- Bar Chart Component ----------
const BarChart = React.memo(function BarChart({
  data,
}: {
  data: MonthlyActivity[];
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.barsRow}>
        {data.map((item, index) => {
          const barHeight = Math.max((item.count / maxCount) * 100, 4);
          return (
            <Animated.View
              key={item.month}
              entering={FadeInDown.delay(index * 80)
                .duration(500)
                .springify()}
              style={chartStyles.barWrapper}
            >
              <View style={chartStyles.barTrack}>
                <GradientView
                  colors={[colors.primary, colors.primaryDark]}
                  style={[chartStyles.barFill, { height: barHeight }]}
                />
              </View>
              <Text style={chartStyles.barLabel}>{item.month}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
});

const chartStyles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barTrack: {
    width: 28,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 45, 120, 0.08)',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});

// ---------- Giver Row Component ----------
const GiverRow = React.memo(function GiverRow({
  giver,
  rank,
  index,
}: {
  giver: TopGiver;
  rank: number;
  index: number;
}) {
  const displayName = giver.full_name || giver.username || 'Пользователь';
  const giftText = pluralize(giver.count, 'подарок', 'подарка', 'подарков');

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 100).duration(400).springify()}
      style={giverStyles.row}
    >
      {/* Rank badge */}
      <View style={giverStyles.rankBadge}>
        <Text style={giverStyles.rankText}>{rank}</Text>
      </View>

      {/* Avatar with gradient ring */}
      <View style={giverStyles.avatarRing}>
        <GradientView
          colors={gradients.primary}
          style={giverStyles.avatarGradient}
        >
          <View style={giverStyles.avatarInner}>
            <Avatar uri={giver.avatar_url} name={displayName} size={40} />
          </View>
        </GradientView>
      </View>

      {/* Info */}
      <View style={giverStyles.info}>
        <Text style={giverStyles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={giverStyles.subtitle}>{giftText}</Text>
      </View>

      {/* Count badge */}
      <View style={giverStyles.countBadge}>
        <Text style={giverStyles.countText}>{giver.count}</Text>
      </View>
    </Animated.View>
  );
});

const giverStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rankText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  avatarRing: {
    marginRight: spacing.md,
  },
  avatarGradient: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
});

// ---------- Main Screen ----------
export default function StatsScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/stats/me');
      setStats(data);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [navigation]);

  // Compute trend percentage (compare last 2 months)
  const trendPercent = (() => {
    if (!stats || stats.monthly_activity.length < 2) return null;
    const last = stats.monthly_activity[stats.monthly_activity.length - 1].count;
    const prev = stats.monthly_activity[stats.monthly_activity.length - 2].count;
    if (prev === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - prev) / prev) * 100);
  })();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Text style={styles.backArrow}>{'‹'}</Text>
          </Pressable>
          <Text style={styles.title}>{'Статистика'}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Text style={styles.backArrow}>{'‹'}</Text>
          </Pressable>
          <Text style={styles.title}>{'Статистика'}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{'📊'}</Text>
          <Text style={styles.emptyTitle}>{'Нет данных'}</Text>
          <Text style={styles.emptySubtitle}>
            {'Добавьте подарки в свои списки,\nчтобы увидеть статистику'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.title}>{'Статистика'}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Activity Card */}
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={styles.activityCard}
        >
          <GradientView
            colors={['#1E1E2E', '#141420']}
            style={styles.activityCardGradient}
          >
            <View style={styles.activityHeader}>
              <View>
                <Text style={styles.activityLabel}>{'Активность'}</Text>
                <View style={styles.activityValueRow}>
                  <Text style={styles.activityCount}>
                    {stats.total_gifts}
                  </Text>
                  <Text style={styles.activityUnit}>
                    {' '}{pluralize(stats.total_gifts, 'подарок', 'подарка', 'подарков')}
                  </Text>
                </View>
              </View>
              {trendPercent !== null && (
                <View
                  style={[
                    styles.trendBadge,
                    trendPercent >= 0
                      ? styles.trendBadgePositive
                      : styles.trendBadgeNegative,
                  ]}
                >
                  <Text
                    style={[
                      styles.trendText,
                      trendPercent >= 0
                        ? styles.trendTextPositive
                        : styles.trendTextNegative,
                    ]}
                  >
                    {trendPercent >= 0 ? '+' : ''}{trendPercent}{'%'}
                  </Text>
                </View>
              )}
            </View>

            {/* Bar chart */}
            {stats.monthly_activity.length > 0 && (
              <BarChart data={stats.monthly_activity} />
            )}

            {/* Reserved count bottom */}
            <View style={styles.reservedRow}>
              <Text style={styles.reservedLabel}>{'Забронировано'}</Text>
              <Text style={styles.reservedValue}>
                {stats.reserved_count}{' / '}{stats.total_gifts}
              </Text>
            </View>
          </GradientView>
        </Animated.View>

        {/* Mini Cards Row */}
        <View style={styles.miniCardsRow}>
          {/* Top Category */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(500).springify()}
            style={styles.miniCard}
          >
            <GradientView
              colors={['#1E1E2E', '#141420']}
              style={styles.miniCardGradient}
            >
              <View style={styles.miniCardIconWrap}>
                <Text style={styles.miniCardIcon}>{'📦'}</Text>
              </View>
              <Text style={styles.miniCardLabel}>{'Популярная\nкатегория'}</Text>
              <Text style={styles.miniCardValue} numberOfLines={1}>
                {stats.top_category || '—'}
              </Text>
            </GradientView>
          </Animated.View>

          {/* Average Price */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(500).springify()}
            style={styles.miniCard}
          >
            <GradientView
              colors={['#1E1E2E', '#141420']}
              style={styles.miniCardGradient}
            >
              <View style={styles.miniCardIconWrap}>
                <Text style={styles.miniCardIcon}>{'💰'}</Text>
              </View>
              <Text style={styles.miniCardLabel}>{'Средний\nчек'}</Text>
              <Text style={styles.miniCardValue} numberOfLines={1}>
                {stats.avg_price > 0
                  ? formatPrice(Math.round(stats.avg_price), 'RUB')
                  : '—'}
              </Text>
            </GradientView>
          </Animated.View>
        </View>

        {/* Top Givers Section */}
        {stats.top_givers.length > 0 && (
          <View style={styles.giversSection}>
            <SectionHeader title="Топ дарителей" />
            {stats.top_givers.map((giver, index) => (
              <GiverRow
                key={giver.user_id}
                giver={giver}
                rank={index + 1}
                index={index}
              />
            ))}
          </View>
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  headerRight: {
    width: 24,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },

  // Loading
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Activity Card
  activityCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityCardGradient: {
    padding: spacing.xl,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activityLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  activityValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  activityCount: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  activityUnit: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },

  // Trend badge
  trendBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  trendBadgePositive: {
    backgroundColor: colors.successBg,
  },
  trendBadgeNegative: {
    backgroundColor: colors.dangerBg,
  },
  trendText: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  trendTextPositive: {
    color: colors.success,
  },
  trendTextNegative: {
    color: colors.danger,
  },

  // Reserved row
  reservedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reservedLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  reservedValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  // Mini Cards
  miniCardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  miniCard: {
    flex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniCardGradient: {
    padding: spacing.lg,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  miniCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  miniCardIcon: {
    fontSize: 18,
  },
  miniCardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  miniCardValue: {
    ...typography.h4,
    color: colors.textPrimary,
  },

  // Givers
  giversSection: {
    marginTop: spacing.xxl,
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

  // Bottom spacer
  bottomSpacer: {
    height: 100,
  },
});
