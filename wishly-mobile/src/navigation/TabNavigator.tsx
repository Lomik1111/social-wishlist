import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/tabs/DashboardScreen';
import ExploreScreen from '../screens/tabs/ExploreScreen';
import ReservationsScreen from '../screens/tabs/ReservationsScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
import { TabParamList } from './types';
import { TabBar } from '../components/ui/TabBar';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Reservations" component={ReservationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
