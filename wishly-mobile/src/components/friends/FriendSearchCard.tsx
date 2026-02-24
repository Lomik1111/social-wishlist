import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Avatar } from '../ui/Avatar';
import { haptic } from '../../lib/haptics';
import { useFriendStore } from '../../store/friendStore';
import { colors, spacing, typography } from '../../constants/design';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface UserPublic {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

interface FriendSearchCardProps {
  user: UserPublic;
  onPress?: () => void;
}

export const FriendSearchCard = React.memo(function FriendSearchCard({
  user,
  onPress,
}: FriendSearchCardProps) {
  const sendRequest = useFriendStore((s) => s.sendRequest);
  const [sent, setSent] = useState(false);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAdd = useCallback(async () => {
    if (sent) return;
    try {
      await sendRequest(user.id);
      setSent(true);
      haptic.success();
    } catch {
      haptic.error();
    }
  }, [user.id, sent]);

  return (
    <AnimatedPressable
      style={[styles.card, animatedStyle]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <Avatar
        uri={user.avatar_url}
        name={user.full_name}
        size={48}
        showOnline
        isOnline={user.is_online}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{user.full_name || 'Пользователь'}</Text>
        {user.username && <Text style={styles.username}>@{user.username}</Text>}
      </View>
      <Pressable
        style={[styles.addButton, sent && styles.addButtonSent]}
        onPress={handleAdd}
      >
        {sent ? (
          <Text style={styles.addButtonSentText}>✓</Text>
        ) : (
          <Text style={styles.addButtonText}>Добавить</Text>
        )}
      </Pressable>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  username: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  addButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  addButtonSent: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addButtonSentText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
