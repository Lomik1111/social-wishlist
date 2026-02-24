import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors, typography, spacing } from '../../constants/design';

const { width } = Dimensions.get('window');

interface ConfettiScreenProps {
  visible: boolean;
  message?: string;
  onComplete?: () => void;
}

export function ConfettiScreen({
  visible,
  message = 'Подарок забронирован!',
  onComplete,
}: ConfettiScreenProps) {
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        onComplete?.();
      }, 3000);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
      <ConfettiCannon
        ref={confettiRef}
        count={100}
        origin={{ x: width / 2, y: -20 }}
        fadeOut
        autoStart
        colors={['#FF2D78', '#FF6B35', '#6C5CE7', '#A29BFE', '#00D68F', '#FFFFFF']}
      />
      <View style={styles.content}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: { alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: spacing.lg },
  message: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
