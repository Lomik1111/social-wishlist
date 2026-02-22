import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { PillButton } from '../ui/PillButton';
import { haptic } from '../../lib/haptics';
import api from '../../lib/api';
import { colors, spacing, typography } from '../../constants/design';

interface ReserveSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemId: string;
  itemName: string;
}

export function ReserveSheet({
  visible,
  onClose,
  onSuccess,
  itemId,
  itemName,
}: ReserveSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReserve = useCallback(async () => {
    setIsLoading(true);
    haptic.heavy();
    try {
      await api.post(`/items/${itemId}/reserve`, { is_anonymous: isAnonymous });
      haptic.success();
      onSuccess();
    } catch {
      haptic.error();
    } finally {
      setIsLoading(false);
    }
  }, [itemId, isAnonymous]);

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={['35%']}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.indicator}
      enablePanDownToClose
      onClose={onClose}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Забронировать подарок?</Text>
        <Text style={styles.itemName}>{itemName}</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>🕵️ Анонимная бронь</Text>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: colors.surfaceCard, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <PillButton
          title="Забронировать →"
          onPress={handleReserve}
          loading={isLoading}
          variant="white"
          style={styles.reserveButton}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.surface },
  indicator: { backgroundColor: colors.textTertiary, width: 40 },
  content: { padding: spacing.xxl },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  itemName: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  toggleLabel: { ...typography.body, color: colors.textPrimary },
  reserveButton: { marginTop: spacing.sm },
});
