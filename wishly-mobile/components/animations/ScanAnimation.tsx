import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../../constants/design';

interface ScanAnimationProps {
  isScanning: boolean;
}

export function ScanAnimation({ isScanning }: ScanAnimationProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isScanning) {
      translateY.value = withRepeat(
        withTiming(180, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      translateY.value = 0;
    }
  }, [isScanning]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isScanning) return null;

  return (
    <View style={styles.container}>
      <View style={styles.skeleton}>
        <Animated.View style={[styles.scanLine, lineStyle]} />
        <View style={styles.skeletonContent}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonLines}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
            <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
          </View>
        </View>
      </View>
      <Text style={styles.label}>СКАНИРОВАНИЕ...</Text>
      <Text style={styles.sublabel}>Мы извлекаем название, цену и фото</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl },
  skeleton: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00D68F',
    shadowColor: '#00D68F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    zIndex: 1,
  },
  skeletonContent: {
    flexDirection: 'row',
    padding: spacing.lg,
    flex: 1,
  },
  skeletonImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skeletonLines: {
    flex: 1,
    marginLeft: spacing.lg,
    justifyContent: 'center',
    gap: spacing.sm,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  skeletonLineShort: { width: '60%' },
  skeletonLineMedium: { width: '40%' },
  label: {
    ...typography.label,
    color: '#00D68F',
    letterSpacing: 2,
  },
  sublabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
