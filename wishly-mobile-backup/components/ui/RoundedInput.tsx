import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';

interface RoundedInputProps extends TextInputProps {
  label?: string;
  icon?: string;
  error?: string;
}

export function RoundedInput({ label, icon, error, ...props }: RoundedInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused, error && styles.inputWrapperError]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={styles.input}
          placeholderTextColor="#4A4A6A"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#8A8AA0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputWrapperFocused: {
    borderColor: 'rgba(255, 45, 120, 0.4)',
  },
  inputWrapperError: {
    borderColor: '#FF4444',
  },
  icon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '400',
    padding: 0,
  },
  error: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 6,
  },
});
