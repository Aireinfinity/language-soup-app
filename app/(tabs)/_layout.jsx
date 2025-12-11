import { Tabs } from 'expo-router';
import { Globe, User } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { View, Image } from 'react-native';

export default function TabLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: '#fff',
                    tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
                    tabBarShowLabel: true,
                    tabBarStyle: {
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        elevation: 0,
                        backgroundColor: '#19b091',
                        borderTopWidth: 0,
                        height: 80,
                        paddingBottom: 20,
                        paddingTop: 10,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                    },
                    tabBarItemStyle: {
                        paddingVertical: 4,
                    },
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: '600',
                    },
                    tabBarBackground: () => (
                        <View style={{ flex: 1, backgroundColor: 'transparent' }} />
                    ),
                }}
            >
                <Tabs.Screen
                    name="community"
                    options={{
                        title: 'Community',
                        tabBarIcon: ({ color }) => <Globe size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Your Soup',
                        tabBarLabel: () => null, // Hide label for the floating button look
                        tabBarIcon: ({ focused }) => (
                            <View style={{
                                width: 60,
                                height: 60,
                                borderRadius: 30,
                                backgroundColor: '#fff',
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginBottom: 30,
                                shadowColor: focused ? "#ec008b" : "#000", // Pink shadow when active
                                shadowOffset: {
                                    width: 0,
                                    height: 4,
                                },
                                shadowOpacity: 0.3,
                                shadowRadius: 4.65,
                                elevation: 8,
                                borderWidth: focused ? 3 : 0,
                                borderColor: '#ec008b', // Pink ring
                                transform: [{ scale: focused ? 1.1 : 1 }] // Slight pop
                            }}>
                                <Image
                                    source={require('../../assets/images/logo.png')}
                                    style={{ width: 40, height: 40, opacity: focused ? 1 : 0.9 }}
                                    resizeMode="contain"
                                />
                            </View>
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: 'Profile',
                        tabBarIcon: ({ color }) => <User size={24} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="support"
                    options={{
                        href: null, // Hide from tab bar
                    }}
                />
            </Tabs>
        </View>
    );
}
