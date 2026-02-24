import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { haptic } from '../../lib/haptics';
import { timeAgo } from '../../lib/utils';
import api from '../../lib/api';
import { colors, spacing, radius, typography } from '../../constants/design';
import type { Reservation } from '../../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------- ReservationCard ----------
const ReservationCard = React.memo(function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: Reservation;
  onCancel: (id: string) => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCancel = useCallback(() => {
    haptic.warning();
    Alert.alert(
      'Отменить бронирование',
      `Вы уверены, что хотите отменить бронирование "${reservation.item_name}"?`,
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: () => onCancel(reservation.id),
        },
      ],
    );
  }, [reservation.id, reservation.item_name, onCancel]);

  return (
    <Animated.View style={animatedStyle}>
      <Card style={styles.reservationCard}>
        <View style={styles.cardRow}>
          {/* Product Image */}
          <View style={styles.imageContainer}>
            {reservation.item_image_url ? (
              <Image
                source={{ uri: reservation.item_image_url }}
                style={styles.productImage}
              />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.placeholderEmoji}>🎁</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.itemName} numberOfLines={2}>
              {reservation.item_name}
            </Text>

            <Badge label="ЗАБРОНИРОВАНО" variant="success" />

            {/* Owner row */}
            <View style={styles.ownerRow}>
              <Text style={styles.forLabel}>Для: </Text>
              <Avatar
                name={reservation.wishlist_owner_name}
                size={20}
              />
              <Text style={styles.ownerName} numberOfLines={1}>
                {reservation.wishlist_owner_name}
              </Text>
            </View>

            {/* Bottom row */}
            <View style={styles.bottomRow}>
              <Text style={styles.timeAgo}>
                Добавлено {timeAgo(reservation.created_at)}
              </Text>
              <Pressable onPress={handleCancel} hitSlop={8}>
                <Text style={styles.cancelText}>Отменить ✕</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
});

// ---------- Main Screen ----------
export default function ReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchReservations = useCallback(async () => {
    try {
      const { data } = await api.get('/reservations/mine');
      setReservations(data);
    } catch {
      Alert.alert('Ошибка', 'Не удалось загрузить бронирования');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchReservations();
  }, [fetchReservations]);

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/reservations/${id}`);
        haptic.success();
        setReservations((prev) => prev.filter((r) => r.id !== id));
      } catch {
        haptic.error();
        Alert.alert('Ошибка', 'Не удалось отменить бронирование');
      }
    },
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Reservation }) => (
      <ReservationCard reservation={item} onCancel={handleCancel} />
    ),
    [handleCancel],
  );

  const keyExtractor = useCallback((item: Reservation) => item.id, []);

  const ListFooterComponent = useCallback(
    () =>
      reservations.length > 0 ? (
        <View style={styles.footerEmpty}>
          <Text style={styles.footerEmoji}>🎁</Text>
          <Text style={styles.footerText}>
            Это все ваши текущие бронирования
          </Text>
        </View>
      ) : null,
    [reservations.length],
  );

  const ListEmptyComponent = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Нет бронирований</Text>
          <Text style={styles.emptySubtitle}>
            Забронированные подарки друзей появятся здесь
          </Text>
        </View>
      ) : null,
    [isLoading],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Мои бронирования</Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={reservations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
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
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
    flexGrow: 1,
  },

  // Reservation card
  reservationCard: {
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
  },
  imageContainer: {
    marginRight: spacing.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  forLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  ownerName: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeAgo: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cancelText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },

  // Empty state
  emptyState: {
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

  // Footer
  footerEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  footerEmoji: {
    fontSize: 32,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
