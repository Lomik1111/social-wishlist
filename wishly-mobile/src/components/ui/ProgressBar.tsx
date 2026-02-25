import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface ProgressBarProps {
  progress: number;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ progress, height = 6, style }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.track, { height }, style]}>
      <LinearGradient
        colors={['#FF2D78', '#6C5CE7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${clampedProgress * 100}%` as DimensionValue, height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 999,
  },
});
