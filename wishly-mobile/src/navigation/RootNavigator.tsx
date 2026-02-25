import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import WishlistCreateScreen from '../screens/WishlistCreateScreen';
import WishlistDetailScreen from '../screens/WishlistDetailScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import FriendProfileScreen from '../screens/FriendProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import StatsScreen from '../screens/StatsScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import PrivacyScreen from '../screens/settings/PrivacyScreen';
import ThemeScreen from '../screens/settings/ThemeScreen';
import SecurityScreen from '../screens/settings/SecurityScreen';
import { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, restoreSession, isLoading } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#FF2D78" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="WishlistCreate" component={WishlistCreateScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="WishlistDetail" component={WishlistDetailScreen} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
          <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Stats" component={StatsScreen} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="SettingsPrivacy" component={PrivacyScreen} />
          <Stack.Screen name="SettingsTheme" component={ThemeScreen} />
          <Stack.Screen name="SettingsSecurity" component={SecurityScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
