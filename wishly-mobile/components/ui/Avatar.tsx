import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getInitials } from '../../lib/utils';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}

export function Avatar({ uri, name, size = 44, showOnline = false, isOnline = false }: AvatarProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, containerStyle]} />
      ) : (
        <View style={[styles.fallback, containerStyle]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnline && isOnline && (
        <View style={[styles.onlineDot, { right: 0, bottom: 0 }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00D68F',
    borderWidth: 2,
    borderColor: '#0A0A0F',
  },
});
