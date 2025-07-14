import { Tabs } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';



export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2a4365',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: 70 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="HomeDashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="Medications"
        options={{
          title: 'Medications',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="pill" size={size} color={color} />, // pill icon
        }}
      />
      <Tabs.Screen
        name="Settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
} 