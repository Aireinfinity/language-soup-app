import { Tabs } from 'expo-router';
import { Globe, User } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { View, Text } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TutorialOverlay from '../../components/TutorialOverlay';

export default function TabLayout() {
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        checkTutorial();
    }, []);

    const checkTutorial = async () => {
        try {
            const hasSeenTutorial = await AsyncStorage.getItem('hasSeenTutorial');
            if (!hasSeenTutorial) {
                // Small delay to let tabs render
                setTimeout(() => setShowTutorial(true), 500);
            }
        } catch (e) {
            console.error('Tutorial check error:', e);
        }
    };

    const handleTutorialComplete = async () => {
        try {
            await AsyncStorage.setItem('hasSeenTutorial', 'true');
            setShowTutorial(false);
        } catch (e) {
            console.error('Tutorial save error:', e);
        }
    };

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
                        tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🍜</Text>,
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

            {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
        </View>
    );
}
