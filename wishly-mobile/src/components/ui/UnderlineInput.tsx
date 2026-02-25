import React, { useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, TextInputProps } from 'react-native';

interface UnderlineInputProps extends TextInputProps {
  label: string;
  icon?: string;
  error?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

export function UnderlineInput({
  label,
  icon,
  error,
  rightIcon,
  onRightIconPress,
  ...props
}: UnderlineInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, isFocused && styles.inputRowFocused, error && styles.inputRowError]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={styles.input}
          placeholderTextColor="#4A4A6A"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && (
          <Pressable onPress={onRightIconPress}>
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: '#8A8AA0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 12,
  },
  inputRowFocused: {
    borderBottomColor: '#FF2D78',
  },
  inputRowError: {
    borderBottomColor: '#FF4444',
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '400',
    padding: 0,
  },
  rightIcon: {
    fontSize: 18,
    marginLeft: 12,
  },
  error: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 6,
  },
});
