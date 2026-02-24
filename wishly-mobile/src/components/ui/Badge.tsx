import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary';
}

const VARIANT_STYLES = {
  success: { bg: 'rgba(0, 214, 143, 0.15)', text: '#00D68F' },
  warning: { bg: 'rgba(246, 166, 35, 0.15)', text: '#F6A623' },
  danger: { bg: 'rgba(255, 68, 68, 0.15)', text: '#FF4444' },
  info: { bg: 'rgba(0, 153, 255, 0.15)', text: '#0099FF' },
  primary: { bg: 'rgba(255, 45, 120, 0.15)', text: '#FF2D78' },
  default: { bg: 'rgba(255, 255, 255, 0.08)', text: '#8A8AA0' },
};

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const variantStyle = VARIANT_STYLES[variant];

  return (
    <View style={[styles.badge, { backgroundColor: variantStyle.bg }]}>
      <Text style={[styles.text, { color: variantStyle.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
