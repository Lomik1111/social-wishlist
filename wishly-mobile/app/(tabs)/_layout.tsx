import { Tabs } from 'expo-router';
import { TabBar } from '../../components/ui/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Поиск',
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Брони',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
        }}
      />
    </Tabs>
  );
}
