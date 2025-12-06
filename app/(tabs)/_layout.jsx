import { Tabs } from 'expo-router';
import { Home, Globe2, User, LifeBuoy } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { View } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textLight,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 20, // Move higher
                    left: 20,
                    right: 20,
                    elevation: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Translucent
                    borderRadius: 24,
                    height: 60,
                    borderTopWidth: 0,
                    shadowColor: Colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
                tabBarBackground: () => (
                    <View style={{ flex: 1, backgroundColor: 'transparent' }} />
                ),
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Groups',
                    tabBarIcon: ({ color }) => <Home size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="community"
                options={{
                    title: 'Community',
                    tabBarIcon: ({ color }) => <Globe2 size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="support"
                options={{
                    title: 'Support',
                    tabBarIcon: ({ color }) => <LifeBuoy size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}
