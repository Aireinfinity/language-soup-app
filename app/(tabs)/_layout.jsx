import { Tabs } from 'expo-router';
import { Globe, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Image, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TAB_BAR_HEIGHT = 64;

export default function TabLayout() {
    const [unreadCommunity, setUnreadCommunity] = useState(0);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadUnreadCounts();

        const communityChannel = supabase
            .channel('community-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_messages',
                filter: 'group_id=eq.00000000-0000-0000-0000-000000000000'
            }, () => loadUnreadCounts())
            .subscribe();

        const supportChannel = supabase
            .channel('support-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_support_messages'
            }, () => loadUnreadCounts())
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
            const lastSeenCommunity = await AsyncStorage.getItem('lastSeenCommunity') || new Date(0).toISOString();
            const { count: communityCount } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', '00000000-0000-0000-0000-000000000000')
                .neq('sender_id', userId)
                .gt('created_at', lastSeenCommunity);
            setUnreadCommunity(communityCount || 0);
        } catch (error) {
            console.error('Error loading unread counts:', error);
        }
    };

    const Badge = ({ count }) => {
        if (count === 0) return null;
        return (
            <View style={badgeStyle} pointerEvents="none">
                <Text style={badgeText}>{count > 99 ? '99+' : count}</Text>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <Tabs
                initialRouteName="community"
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: '#fff',
                    tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
                    tabBarShowLabel: true,
                    tabBarStyle: {
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: TAB_BAR_HEIGHT + insets.bottom,
                        paddingBottom: insets.bottom,
                        paddingTop: 10,
                        backgroundColor: '#19b091',
                        borderTopWidth: 0,
                        elevation: 24,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                        zIndex: 10000,
                    },
                    tabBarItemStyle: {
                        paddingVertical: 8,
                    },
                    tabBarLabelStyle: {
                        fontSize: 13,
                        fontWeight: '600',
                    },
                }}
            >
                <Tabs.Screen
                    name="community"
                    options={{
                        title: 'Community',
                        tabBarIcon: ({ color }) => (
                            <View style={{ position: 'relative' }} pointerEvents="none">
                                <Globe size={26} color={color} />
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
                        title: 'Today',
                        tabBarIcon: ({ color, focused }) => (
                            <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
                                <Image
                                    source={require('../../assets/images/logo.png')}
                                    style={{ width: 26, height: 26, opacity: focused ? 1 : 0.7 }}
                                    resizeMode="contain"
                                />
                            </View>
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        href: null,
                        title: 'Profile',
                        tabBarIcon: ({ color }) => <User size={26} color={color} />,
                    }}
                />
                <Tabs.Screen
                    name="support"
                    options={{ href: null }}
                />
            </Tabs>
        </View>
    );
}

const badgeStyle = {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ec008b',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
};
const badgeText = {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
};
