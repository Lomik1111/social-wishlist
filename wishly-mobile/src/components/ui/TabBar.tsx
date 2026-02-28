import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { haptic } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ICONS: Record<string, { active: string; inactive: string; label: string }> = {
  Dashboard: { active: '🏠', inactive: '🏠', label: 'Главная' },
  Explore: { active: '🔍', inactive: '🔍', label: 'Поиск' },
  Reservations: { active: '📋', inactive: '📋', label: 'Брони' },
  Profile: { active: '👤', inactive: '👤', label: 'Профиль' },
};

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function TabBarItem({ route, index, state, descriptors, navigation }: any) {
  const isFocused = state.index === index;
  const scale = useSharedValue(1);
  const tabInfo = TAB_ICONS[route.name] || { active: '\u2699\uFE0F', inactive: '\u2699\uFE0F', label: route.name };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 15 });
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 15 });
    }, 100);
    haptic.light();

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <AnimatedPressable
      style={[styles.tabItem, animatedStyle]}
      onPress={handlePress}
    >
      <Text style={styles.tabIcon}>{isFocused ? tabInfo.active : tabInfo.inactive}</Text>
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
        {tabInfo.label}
      </Text>
      {isFocused && <View style={styles.activeIndicator} />}
    </AnimatedPressable>
  );
}

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom - 10, 8) }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => (
          <TabBarItem
            key={route.key}
            route={route}
            index={index}
            state={state}
            descriptors={descriptors}
            navigation={navigation}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20, 20, 32, 0.95)',
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 64,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#8A8AA0',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FF2D78',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF2D78',
  },
});
