import { Tabs } from 'expo-router';
import { Globe, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { View, Image, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TabLayout() {
    const [unreadCommunity, setUnreadCommunity] = useState(0);
    const [unreadSupport, setUnreadSupport] = useState(0);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadUnreadCounts();

        // Subscribe to new messages
        const communityChannel = supabase
            .channel('community-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_messages',
                filter: 'group_id=eq.00000000-0000-0000-0000-000000000000'
            }, () => {
                loadUnreadCounts();
            })
            .subscribe();

        const supportChannel = supabase
            .channel('support-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_support_messages'
            }, () => {
                loadUnreadCounts();
            })
            .subscribe();

        return () => {
            communityChannel.unsubscribe();
            supportChannel.unsubscribe();
        };
    }, []);

    const loadUnreadCounts = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) return;

            // Get last seen timestamps
            const lastSeenCommunity = await AsyncStorage.getItem('lastSeenCommunity') || new Date(0).toISOString();
            const lastSeenSupport = await AsyncStorage.getItem('lastSeenSupport') || new Date(0).toISOString();

            // Count unread community messages
            const { count: communityCount } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', '00000000-0000-0000-0000-000000000000')
                .neq('sender_id', userId)
                .gt('created_at', lastSeenCommunity);

            // Count unread support messages
            const { count: supportCount } = await supabase
                .from('app_support_messages')
                .select('*', { count: 'exact', head: true })
                .eq('from_admin', true)
                .gt('created_at', lastSeenSupport);

            setUnreadCommunity(communityCount || 0);
            setUnreadSupport(supportCount || 0);
        } catch (error) {
            console.error('Error loading unread counts:', error);
        }
    };

    const Badge = ({ count }) => {
        if (count === 0) return null;
        return (
            <View style={{
                position: 'absolute',
                top: -4,
                right: -8,
                backgroundColor: '#ec008b',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#19b091',
            }}>
                <Text style={{
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 'bold',
                }}>
                    {count > 99 ? '99+' : count}
                </Text>
            </View>
        );
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
                        paddingBottom: insets.bottom + 10,
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
                        tabBarIcon: ({ color }) => (
                            <View>
                                <Globe size={24} color={color} />
                                <Badge count={unreadCommunity} />
                            </View>
                        ),
                    }}
                    listeners={{
                        tabPress: () => {
                            AsyncStorage.setItem('lastSeenCommunity', new Date().toISOString());
                            setUnreadCommunity(0);
                        }
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
