import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../constants/design';
import { haptic } from '../../lib/haptics';

interface CreateCardProps {
  onPress: () => void;
}

export const CreateCard = memo(function CreateCard({ onPress }: CreateCardProps) {
  const handlePress = useCallback(() => {
    haptic.medium();
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.plusIcon}>+</Text>
      </View>
      <Text style={styles.label}>{'\u0421\u043E\u0437\u0434\u0430\u0442\u044C'}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 160,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: colors.textSecondary,
    marginTop: -1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
