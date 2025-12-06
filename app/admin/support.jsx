import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ff6b9d',
    cream: '#fffbf5',
    subtext: '#666',
};

export default function AdminSupportThreads() {
    const router = useRouter();
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadThreads();

        // Subscribe to new support messages
        const channel = supabase
            .channel('admin-support')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_support_messages'
            }, () => {
                loadThreads();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadThreads = async () => {
        try {
            // Get all unique users who have sent support messages
            const { data: messages, error } = await supabase
                .from('app_support_messages')
                .select(`
                    user_id,
                    message,
                    created_at,
                    from_admin,
                    app_users!user_id (
                        id,
                        display_name,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by user_id
            const threadMap = {};
            messages?.forEach(msg => {
                const userId = msg.user_id;
                if (!threadMap[userId]) {
                    threadMap[userId] = {
                        userId,
                        userName: msg.app_users?.display_name || 'Unknown User',
                        avatarUrl: msg.app_users?.avatar_url,
                        lastMessage: msg.message,
                        isFromAdmin: msg.from_admin,
                        timestamp: msg.created_at,
                        unreadCount: 0 // Could implement unread tracking
                    };
                }
            });

            const threadsArray = Object.values(threadMap);
            setThreads(threadsArray);
        } catch (error) {
            console.error('Error loading support threads:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderThread = ({ item }) => (
        <Pressable
            style={styles.threadItem}
            onPress={() => router.push(`/admin/support-thread/${item.userId}`)}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {item.userName.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.threadInfo}>
                <View style={styles.threadHeader}>
                    <Text style={styles.userName}>{item.userName}</Text>
                    <Text style={styles.time}>
                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        })}
                    </Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={2}>
                    {item.isFromAdmin && 'You: '}{item.lastMessage}
                </Text>
            </View>

            {item.unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
            )}
        </Pressable>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Support Threads</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={threads}
                renderItem={renderThread}
                keyExtractor={item => item.userId}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MessageCircle size={64} color={SOUP_COLORS.subtext} />
                        <Text style={styles.emptyText}>No support messages yet</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    list: {
        flexGrow: 1,
    },
    threadItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    threadInfo: {
        flex: 1,
    },
    threadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    time: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    lastMessage: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        lineHeight: 18,
    },
    unreadBadge: {
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginLeft: 8,
    },
    unreadText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        fontSize: 16,
        color: SOUP_COLORS.subtext,
        marginTop: 16,
    },
});
