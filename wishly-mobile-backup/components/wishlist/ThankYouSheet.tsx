import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Avatar } from '../ui/Avatar';
import { PillButton } from '../ui/PillButton';
import { haptic } from '../../lib/haptics';
import api from '../../lib/api';
import { colors, spacing, radius, typography } from '../../constants/design';

const REACTIONS = [
  { key: 'love', emoji: '❤️', label: 'Люблю' },
  { key: 'gift', emoji: '🎁', label: 'Подарок' },
  { key: 'fire', emoji: '🔥', label: 'Огонь' },
  { key: 'sparkle', emoji: '✨', label: 'Искры' },
];

interface ThankYouSheetProps {
  visible: boolean;
  onClose: () => void;
  reservationId: string;
  giverName?: string;
  giverAvatar?: string | null;
  itemName?: string;
  itemImage?: string | null;
}

export function ThankYouSheet({
  visible,
  onClose,
  reservationId,
  giverName,
  giverAvatar,
  itemName,
  itemImage,
}: ThankYouSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedReaction, setSelectedReaction] = useState<string>('love');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(async () => {
    setIsSending(true);
    haptic.success();
    try {
      await api.post(`/reservations/${reservationId}/thanks`, {
        reaction: selectedReaction,
        message: message || null,
      });
      onClose();
    } catch {
      haptic.error();
    } finally {
      setIsSending(false);
    }
  }, [reservationId, selectedReaction, message]);

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['55%']}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.indicator}
      enablePanDownToClose
      onClose={onClose}
    >
      <BottomSheetView style={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.avatarGroup}>
            {itemImage && (
              <View style={styles.itemThumb}>
                <Avatar uri={itemImage} size={52} />
              </View>
            )}
            <Avatar uri={giverAvatar} name={giverName} size={40} />
          </View>
          <Text style={styles.title}>Сказать спасибо</Text>
          <Text style={styles.subtitle}>
            {giverName ? `${giverName} подарил(а) вам ` : 'Вам подарили '}
            <Text style={styles.highlightText}>{itemName || 'подарок'}</Text>
          </Text>
        </View>

        {/* Reactions */}
        <Text style={styles.sectionLabel}>ВЫБЕРИТЕ РЕАКЦИЮ</Text>
        <View style={styles.reactionsRow}>
          {REACTIONS.map((r) => (
            <Pressable
              key={r.key}
              style={[
                styles.reactionItem,
                selectedReaction === r.key && styles.reactionActive,
              ]}
              onPress={() => {
                setSelectedReaction(r.key);
                haptic.selection();
              }}
            >
              <Text style={styles.reactionEmoji}>{r.emoji}</Text>
              {selectedReaction === r.key && (
                <Text style={styles.reactionLabel}>{r.label}</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Message */}
        <TextInput
          style={styles.messageInput}
          placeholder="Напишите сообщение..."
          placeholderTextColor={colors.textTertiary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />

        {/* Send */}
        <PillButton
          title="Отправить благодарность ↑"
          onPress={handleSend}
          loading={isSending}
          variant="white"
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.surface },
  indicator: { backgroundColor: colors.textTertiary, width: 40 },
  content: { padding: spacing.xxl, flex: 1 },
  headerRow: { alignItems: 'center', marginBottom: spacing.xxl },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  itemThumb: { marginRight: -spacing.md, zIndex: 1 },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  highlightText: { color: colors.primary },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  reactionItem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reactionActive: {
    borderColor: colors.primary,
  },
  reactionEmoji: { fontSize: 28 },
  reactionLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
    position: 'absolute',
    bottom: -18,
  },
  messageInput: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.xxl,
  },
});
