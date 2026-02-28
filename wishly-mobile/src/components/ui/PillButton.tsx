import React from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';
import { GradientView } from './GradientView';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PillButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'white' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function PillButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: PillButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    haptic.medium();
    onPress();
  };

  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, styles.glowWrapper, disabled && styles.disabled, style]}
      >
        <GradientView
          colors={['#FF2D78', '#FF6B35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[styles.textPrimary, textStyle]}>{title}</Text>
          )}
        </GradientView>
      </AnimatedPressable>
    );
  }

  if (variant === 'white') {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[animatedStyle, styles.whiteButton, disabled && styles.disabled, style]}
      >
        {loading ? (
          <ActivityIndicator color="#0A0A0F" size="small" />
        ) : (
          <Text style={[styles.textWhite, textStyle]}>{title}</Text>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, styles.outlineButton, disabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <Text style={[styles.textOutline, textStyle]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  glowWrapper: {
    borderRadius: 999,
    shadowColor: '#FF2D78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  textPrimary: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  whiteButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  textWhite: {
    color: '#0A0A0F',
    fontSize: 17,
    fontWeight: '700',
  },
  outlineButton: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 52,
  },
  textOutline: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
