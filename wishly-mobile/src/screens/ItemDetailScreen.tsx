import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Linking,
  Share,
  Alert,
  DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  useAnimatedScrollHandler,
  Extrapolation,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWishlistStore } from '../store/wishlistStore';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import {
  colors,
  gradients,
  spacing,
  radius,
  typography,
  shadows,
} from '../constants/design';
import { formatPrice, extractDomain } from '../lib/utils';
import { haptic } from '../lib/haptics';
import api from '../lib/api';
import type { Item } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 340;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ItemDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {  id  } = route.params || {};
  useEffect(() => {
    if (!id || !UUID_REGEX.test(id)) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  }, [id]);

  const currentItems = useWishlistStore((s) => s.currentItems);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [contributionAmount, setContributionAmount] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [reserving, setReserving] = useState(false);

  const scrollY = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scrollY.value,
          [-100, 0],
          [1.3, 1],
          Extrapolation.CLAMP
        ),
      },
      {
        translateY: interpolate(
          scrollY.value,
          [0, IMAGE_HEIGHT],
          [0, IMAGE_HEIGHT * 0.4],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Try to find item from store first, then fetch from API
  useEffect(() => {
    if (!id) return;

    const storeItem = currentItems.find((i) => i.id === id);
    if (storeItem) {
      setItem(storeItem);
      setLoading(false);
      if (storeItem.is_group_gift && storeItem.price) {
        const remaining = storeItem.price - storeItem.contribution_total;
        setContributionAmount(Math.round(remaining * 0.25));
        setSliderValue(25);
      }
    } else {
      // Fetch from API
      (async () => {
        try {
          const { data } = await api.get(`/items/${id}`);
          setItem(data);
          if (data.is_group_gift && data.price) {
            const remaining = data.price - data.contribution_total;
            setContributionAmount(Math.round(remaining * 0.25));
            setSliderValue(25);
          }
        } catch {
          Alert.alert('Ошибка', 'Не удалось загрузить подарок');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, currentItems]);

  const handleBack = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [navigation]);

  const handleShare = useCallback(async () => {
    if (!item) return;
    haptic.light();
    try {
      await Share.share({
        message: item.url
          ? `Посмотри подарок: ${item.name}\n${item.url}`
          : `Посмотри подарок: ${item.name}`,
      });
    } catch {
      // User cancelled
    }
  }, [item]);

  const handleOpenExternal = useCallback(() => {
    if (!item?.url) return;
    try {
      const parsed = new URL(item.url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return;
      }
      haptic.light();
      Linking.openURL(item.url);
    } catch {
      // Invalid URL — do nothing
    }
  }, [item]);

  const handleSliderChange = useCallback(
    (value: number) => {
      if (!item?.price) return;
      const remaining = item.price - item.contribution_total;
      const amount = Math.round((value / 100) * remaining);
      setSliderValue(value);
      setContributionAmount(amount);
    },
    [item]
  );

  const handleSliderStep = useCallback(
    (direction: 'up' | 'down') => {
      haptic.selection();
      const step = 10;
      const newValue =
        direction === 'up'
          ? Math.min(100, sliderValue + step)
          : Math.max(0, sliderValue - step);
      handleSliderChange(newValue);
    },
    [sliderValue, handleSliderChange]
  );

  const handleReserve = useCallback(async () => {
    if (!item) return;
    setReserving(true);
    haptic.success();

    try {
      if (item.is_group_gift) {
        await api.post(`/items/${item.id}/contribute`, {
          amount: contributionAmount,
        });
      } else {
        await api.post(`/items/${item.id}/reserve`);
      }
      Alert.alert('Готово!', 'Подарок успешно забронирован', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      haptic.error();
      const axiosError = err as import('axios').AxiosError<{ detail?: string }>;
      Alert.alert(
        'Ошибка',
        axiosError.response?.data?.detail || 'Не удалось забронировать'
      );
    } finally {
      setReserving(false);
    }
  }, [item, contributionAmount, navigation]);

  const remaining = useMemo(() => {
    if (!item?.price) return 0;
    return item.price - item.contribution_total;
  }, [item]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{'Подарок не найден'}</Text>
          <Pressable onPress={handleBack} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>{'Назад'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Top navigation - floating */}
      <View style={styles.floatingNav}>
        <SafeAreaView edges={['top']}>
          <View style={styles.floatingNavRow}>
            <Pressable onPress={handleBack} style={styles.navButton}>
              <Text style={styles.navButtonText}>{'<'}</Text>
            </Pressable>
            <View style={styles.navRight}>
              <Pressable onPress={handleShare} style={styles.navButton}>
                <Text style={styles.navButtonText}>{'↗'}</Text>
              </Pressable>
              {item.url && (
                <Pressable onPress={handleOpenExternal} style={styles.navButton}>
                  <Text style={styles.navButtonText}>{'🔗'}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Large product photo */}
        <View style={styles.imageContainer}>
          {item.image_url ? (
            <Animated.Image
              source={{ uri: item.image_url }}
              style={[styles.productImage, imageAnimatedStyle]}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[colors.surfaceElevated, colors.surface]}
              style={styles.imagePlaceholder}
            >
              <Text style={styles.placeholderIcon}>{'🎁'}</Text>
            </LinearGradient>
          )}
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.imageGradient}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Source domain */}
          {item.source_domain && (
            <Text style={styles.sourceDomain}>
              {item.source_domain.toUpperCase()}
            </Text>
          )}

          {/* Badges row */}
          <View style={styles.badgeRow}>
            {item.is_reserved ? (
              <Badge label="Забронировано" variant="warning" />
            ) : (
              <Badge label="Доступно" variant="success" />
            )}
            {item.is_group_gift && <Badge label="Групповой подарок" variant="info" />}
            {item.priority === 'must_have' && (
              <Badge label="Must have" variant="primary" />
            )}
            {item.priority === 'dream' && (
              <Badge label="Мечта" variant="primary" />
            )}
          </View>

          {/* Item name */}
          <Text style={styles.itemName}>{item.name}</Text>

          {/* Price */}
          {item.price !== null && (
            <Text style={styles.price}>
              {formatPrice(item.price, item.currency)}
            </Text>
          )}

          {/* Group gift contribution section */}
          {item.is_group_gift && item.price !== null && (
            <View style={styles.contributionSection}>
              <View style={styles.contributionHeader}>
                <Text style={styles.contributionTitle}>
                  {'Групповой подарок'}
                </Text>
                <Text style={styles.contributionProgress}>
                  {`${item.contribution_count} участников`}
                </Text>
              </View>

              <ProgressBar
                progress={item.progress_percentage / 100}
                height={8}
                style={styles.contributionBar}
              />

              <View style={styles.contributionStats}>
                <Text style={styles.contributionCollected}>
                  {`Собрано: ${formatPrice(item.contribution_total, item.currency)}`}
                </Text>
                <Text style={styles.contributionRemaining}>
                  {`Осталось: ${formatPrice(remaining, item.currency)}`}
                </Text>
              </View>

              {!item.is_reserved && remaining > 0 && (
                <View style={styles.sliderSection}>
                  <Text style={styles.sliderLabel}>
                    {'Ваш вклад:'}
                  </Text>
                  <Text style={styles.sliderAmount}>
                    {formatPrice(contributionAmount, item.currency)}
                  </Text>

                  {/* Simple slider using pressable buttons */}
                  <View style={styles.sliderRow}>
                    <Pressable
                      onPress={() => handleSliderStep('down')}
                      style={styles.sliderStepButton}
                    >
                      <Text style={styles.sliderStepText}>{'-'}</Text>
                    </Pressable>

                    <View style={styles.sliderTrack}>
                      <View
                        style={[
                          styles.sliderFill,
                          { width: `${sliderValue}%` as DimensionValue },
                        ]}
                      />
                    </View>

                    <Pressable
                      onPress={() => handleSliderStep('up')}
                      style={styles.sliderStepButton}
                    >
                      <Text style={styles.sliderStepText}>{'+'}</Text>
                    </Pressable>
                  </View>

                  <View style={styles.sliderLabels}>
                    <Text style={styles.sliderMinLabel}>{'0%'}</Text>
                    <Text style={styles.sliderMaxLabel}>{'100%'}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          {item.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>{'Описание'}</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          )}

          {/* Source link */}
          {item.url && (
            <Pressable onPress={handleOpenExternal} style={styles.sourceLink}>
              <View style={styles.sourceLinkContent}>
                <Text style={styles.sourceLinkLabel}>{'Открыть на сайте'}</Text>
                <Text style={styles.sourceLinkDomain}>
                  {extractDomain(item.url) ?? item.url}
                </Text>
              </View>
              <Text style={styles.sourceLinkArrow}>{'→'}</Text>
            </Pressable>
          )}

          {/* Bottom spacer for fixed button */}
          <View style={styles.bottomSpacer} />
        </View>
      </Animated.ScrollView>

      {/* Bottom fixed reserve button */}
      {!item.is_reserved && (
        <View style={styles.bottomBar}>
          <LinearGradient
            colors={[`${colors.background}00`, colors.background]}
            style={styles.bottomBarGradient}
          />
          <View style={styles.bottomBarContent}>
            <AnimatedPressable
              onPress={handleReserve}
              onPressIn={() => {
                buttonScale.value = withSpring(0.96, { damping: 15 });
              }}
              onPressOut={() => {
                buttonScale.value = withSpring(1, { damping: 15 });
              }}
              disabled={reserving}
              style={[buttonAnimatedStyle, reserving && styles.buttonDisabled]}
            >
              <View style={styles.reserveButtonInner}>
                {reserving ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text style={styles.reserveButtonText}>
                    {item.is_group_gift
                      ? `Внести ${formatPrice(contributionAmount, item.currency)}`
                      : 'Забронировать  \u2192'}
                  </Text>
                )}
              </View>
            </AnimatedPressable>
          </View>
        </View>
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
  errorText: {
    ...typography.h4,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
  },
  errorButtonText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // ---- Floating nav ----
  floatingNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  floatingNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  navRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // ---- Image ----
  imageContainer: {
    height: IMAGE_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 72,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  // ---- Content ----
  content: {
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xl,
  },
  sourceDomain: {
    ...typography.label,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  itemName: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -1.5,
    marginBottom: spacing.xl,
  },

  // ---- Contribution ----
  contributionSection: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  contributionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  contributionProgress: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  contributionBar: {
    marginBottom: spacing.md,
  },
  contributionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contributionCollected: {
    ...typography.bodySmall,
    color: colors.success,
  },
  contributionRemaining: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  // ---- Slider ----
  sliderSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
  },
  sliderLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sliderAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sliderStepButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sliderStepText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: 52,
  },
  sliderMinLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  sliderMaxLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // ---- Description ----
  descriptionSection: {
    marginBottom: spacing.xl,
  },
  descriptionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // ---- Source link ----
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  sourceLinkContent: {
    flex: 1,
  },
  sourceLinkLabel: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sourceLinkDomain: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  sourceLinkArrow: {
    fontSize: 20,
    color: colors.primary,
    marginLeft: spacing.md,
  },

  // ---- Bottom bar ----
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBarGradient: {
    height: 32,
  },
  bottomBarContent: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.sm,
  },
  reserveButtonInner: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.full,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveButtonText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  bottomSpacer: {
    height: 100,
  },
});
