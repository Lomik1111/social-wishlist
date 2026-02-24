import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Explore: undefined;
  Reservations: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<TabParamList>;
  WishlistCreate: { addToWishlist?: string } | undefined;
  WishlistDetail: { id: string };
  ItemDetail: { id: string };
  FriendProfile: { username: string };
  Notifications: undefined;
  Stats: undefined;
  Favorites: undefined;
  SettingsPrivacy: undefined;
  SettingsTheme: undefined;
  SettingsSecurity: undefined;
};
