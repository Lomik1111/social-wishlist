import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore } from '../store/notificationStore';
import { useFriendStore } from '../store/friendStore';
import { Avatar } from '../components/ui/Avatar';
import { PillButton } from '../components/ui/PillButton';
import { haptic } from '../lib/haptics';
import { timeAgo } from '../lib/utils';
import { colors, spacing, radius, typography } from '../constants/design';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------- Types ----------


type FilterType = 'all' | 'gift' | 'friend_request' | 'like';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'gift', label: 'Подарки' },
  { key: 'friend_request', label: 'Друзья' },
  { key: 'like', label: 'Лайки' },
];

const TYPE_ICONS: Record<string, string> = {
  gift: '\uD83C\uDF81',
  friend_request: '\uD83D\uDC64',
  like: '\u2764\uFE0F',
  reservation: '\uD83D\uDD12',
  default: '\uD83D\uDD14',
};

// ---------- NotificationRow ----------
const NotificationRow = React.memo(function NotificationRow({
  notification,
  onAcceptRequest,
  onDelete,
}: {
  notification: Notification;
  onAcceptRequest: (senderId: string) => void;
  onDelete: (id: string) => void;
}) {
  const senderName = (notification.data?.sender_name as string) || 'Пользователь';
  const senderAvatar = (notification.data?.sender_avatar as string) || null;
  const itemName = (notification.data?.item_name as string) || null;
  const wishlistName = (notification.data?.wishlist_name as string) || null;
  const typeIcon = TYPE_ICONS[notification.type] || TYPE_ICONS.default;

  const handleAccept = useCallback(() => {
    if (notification.sender_id) {
      haptic.success();
      onAcceptRequest(notification.sender_id);
    }
  }, [notification.sender_id, onAcceptRequest]);

  const handleDelete = useCallback(() => {
    haptic.light();
    onDelete(notification.id);
  }, [notification.id, onDelete]);

  // Build body text with highlights
  const renderBody = useCallback(() => {
    const body = notification.body || '';
    // Simple approach: render body with bold sender name
    return (
      <Text style={styles.notifBody} numberOfLines={3}>
        <Text style={styles.notifSenderName}>{senderName}</Text>
        {' '}
        {body}
        {itemName && (
          <Text style={styles.notifHighlight}> {itemName}</Text>
        )}
        {wishlistName && !itemName && (
          <Text style={styles.notifHighlight}> {wishlistName}</Text>
        )}
      </Text>
    );
  }, [notification.body, senderName, itemName, wishlistName]);

  return (
    <View style={[styles.notifRow, !notification.is_read && styles.notifRowUnread]}>
      {/* Unread dot */}
      {!notification.is_read && <View style={styles.unreadDot} />}

      {/* Avatar + type icon overlay */}
      <View style={styles.notifAvatarContainer}>
        <Avatar uri={senderAvatar} name={senderName} size={44} />
        <View style={styles.typeIconOverlay}>
          <Text style={styles.typeIconText}>{typeIcon}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        {renderBody()}
        <Text style={styles.notifTime}>{timeAgo(notification.created_at)}</Text>

        {/* Accept button for friend requests */}
        {notification.type === 'friend_request' && (
          <Pressable style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.acceptButtonText}>Принять</Text>
          </Pressable>
        )}
      </View>

      {/* Delete */}
      <Pressable
        style={styles.deleteButton}
        onPress={handleDelete}
        hitSlop={8}
      >
        <Text style={styles.deleteIcon}>✕</Text>
      </Pressable>
    </View>
  );
});

// ---------- Main Screen ----------
export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const {
    notifications,
    isLoading,
    fetchNotifications,
    markAllRead,
    deleteNotification,
  } = useNotificationStore();

  const { acceptRequest } = useFriendStore();

  // Fetch on mount + filter change
  useEffect(() => {
    const filterType = activeFilter === 'all' ? undefined : activeFilter;
    fetchNotifications(filterType);
  }, [activeFilter, fetchNotifications]);

  const handleMarkAllRead = useCallback(() => {
    haptic.success();
    markAllRead();
  }, [markAllRead]);

  const handleAcceptRequest = useCallback(
    async (senderId: string) => {
      try {
        await acceptRequest(senderId);
        // Refresh notifications
        fetchNotifications(activeFilter === 'all' ? undefined : activeFilter);
      } catch {
        haptic.error();
      }
    },
    [acceptRequest, fetchNotifications, activeFilter],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotification(id);
    },
    [deleteNotification],
  );

  const handleFilterPress = useCallback((filter: FilterType) => {
    haptic.selection();
    setActiveFilter(filter);
  }, []);

  const handleBack = useCallback(() => {
    haptic.light();
    navigation.goBack();
  }, [navigation]);

  // Partition into sections: "НОВЫЕ" (unread) and "РАНЕЕ" (read)
  const sections = useMemo(() => {
    const unread = notifications.filter((n) => !n.is_read);
    const read = notifications.filter((n) => n.is_read);
    const result: { title: string; data: Notification[] }[] = [];
    if (unread.length > 0) {
      result.push({ title: 'НОВЫЕ', data: unread });
    }
    if (read.length > 0) {
      result.push({ title: 'РАНЕЕ', data: read });
    }
    return result;
  }, [notifications]);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationRow
        notification={item}
        onAcceptRequest={handleAcceptRequest}
        onDelete={handleDelete}
      />
    ),
    [handleAcceptRequest, handleDelete],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: Notification) => item.id, []);

  const ListEmptyComponent = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Нет уведомлений</Text>
          <Text style={styles.emptySubtitle}>
            Здесь будут появляться ваши уведомления
          </Text>
        </View>
      ) : null,
    [isLoading],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={handleBack} hitSlop={12}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Уведомления</Text>
        </View>
        <Pressable onPress={handleMarkAllRead} hitSlop={8}>
          <Text style={styles.markAllRead}>✓✓</Text>
        </Pressable>
      </View>

      {/* Chip Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterChip,
              activeFilter === filter.key && styles.filterChipActive,
            ]}
            onPress={() => handleFilterPress(filter.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter.key && styles.filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={ListEmptyComponent}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  markAllRead: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700',
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Loading
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // List
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Section header
  sectionHeaderContainer: {
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeaderText: {
    ...typography.label,
    color: colors.textSecondary,
  },

  // Notification row
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginBottom: 4,
    position: 'relative',
  },
  notifRowUnread: {
    backgroundColor: 'rgba(255, 45, 120, 0.04)',
  },
  unreadDot: {
    position: 'absolute',
    left: 0,
    top: 22,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  // Avatar area
  notifAvatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
    marginLeft: spacing.sm,
  },
  typeIconOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconText: {
    fontSize: 10,
  },

  // Content
  notifContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  notifBody: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  notifSenderName: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notifHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  notifTime: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Accept button
  acceptButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 40,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },

  // Delete
  deleteButton: {
    padding: spacing.xs,
    marginTop: 4,
  },
  deleteIcon: {
    fontSize: 14,
    color: colors.textTertiary,
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
});
