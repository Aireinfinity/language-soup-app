import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, AlertCircle, Wrench, Lightbulb, CheckCircle, Plus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import TicketModal from '../../components/TicketModal';

const SOUP_COLORS = {
    blue: '#00adef',
    green: '#19b091',
    yellow: '#f1c40f',
    red: '#e74c3c',
    cream: '#FDF5E6',
    pink: '#ff6b9d',
    subtext: '#666',
};

const PRIORITY_COLORS = {
    'P0': SOUP_COLORS.red,
    'P1': SOUP_COLORS.yellow,
    'P2': SOUP_COLORS.green,
};

const STATUS_LABELS = {
    new: 'Open',
    fixing: 'In Progress',
    fixed: 'Done'
};

export default function AdminSupportThreads() {
    const { user } = useAuth();
    const router = useRouter();
    const [threads, setThreads] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeMainTab, setActiveMainTab] = useState('inbox'); // 'inbox' or 'tickets'
    const [activeFilter, setActiveFilter] = useState('all'); // for inbox
    const [stats, setStats] = useState({ urgent: 0, bugs: 0, requests: 0 });
    const [createModalVisible, setCreateModalVisible] = useState(false);

    useEffect(() => {
        loadThreads();

        const channel = supabase
            .channel('admin-support')
            .on('postgres_changes', {
                event: '*',
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
            const { data: messages, error } = await supabase
                .from('app_support_messages')
                .select(`
                    id,
                    user_id,
                    content,
                    created_at,
                    from_admin,
                    priority,
                    status,
                    category,
                    title,
                    app_users (
                        id,
                        display_name,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const threadMap = {};
            const ticketList = [];

            let urgentCount = 0;
            let bugsCount = 0;
            let requestsCount = 0;

            messages?.forEach(msg => {
                // 1. Thread Map (Group by User for Inbox)
                if (!threadMap[msg.user_id]) {
                    threadMap[msg.user_id] = {
                        userId: msg.user_id,
                        userName: msg.app_users?.display_name || 'Unknown User',
                        avatarUrl: msg.app_users?.avatar_url,
                        lastMessage: msg.content,
                        isFromAdmin: msg.from_admin,
                        timestamp: msg.created_at,
                        priority: msg.priority,
                        status: msg.status || 'new',
                        category: msg.category,
                        title: msg.title,
                    };
                }

                // 2. Ticket List (Individual Issues)
                if (msg.priority || msg.category || msg.title || (msg.status && msg.status !== 'new')) {
                    ticketList.push({
                        id: msg.id,
                        userId: msg.user_id,
                        userName: msg.app_users?.display_name || 'Unknown User',
                        avatarUrl: msg.app_users?.avatar_url,
                        content: msg.title || msg.content,
                        lastMessage: msg.content,
                        fullContent: msg.content,
                        timestamp: msg.created_at,
                        priority: msg.priority,
                        status: msg.status || 'new',
                        category: msg.category,
                        title: msg.title,
                        from_admin: msg.from_admin
                    });

                    if (msg.priority === 'P0' && msg.status !== 'fixed' && msg.status !== 'wontfix') urgentCount++;
                    if (msg.priority === 'P1' && msg.status !== 'fixed' && msg.status !== 'wontfix') bugsCount++;
                    if (msg.category === 'feature_request' && msg.status !== 'fixed' && msg.status !== 'wontfix') requestsCount++;
                }
            });

            setStats({ urgent: urgentCount, bugs: bugsCount, requests: requestsCount });
            setThreads(Object.values(threadMap));
            setTickets(ticketList);
        } catch (error) {
            console.error('Error loading support threads:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTickets = () => {
        return tickets.filter(t => t.status !== 'fixed' && t.status !== 'wontfix')
            .sort((a, b) => {
                const pOrder = { 'P0': 0, 'P1': 1, 'P2': 2, undefined: 3, null: 3 };
                const pa = pOrder[a.priority];
                const pb = pOrder[b.priority];
                if (pa !== pb) return pa - pb;
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
    };

    const getInbox = () => {
        // Simple filter: All vs Unread
        if (activeFilter === 'unread') {
            // Logic to filter unread only if we have that flag, otherwise show all
            return threads.filter(t => t.status === 'new' && !t.from_admin);
        }
        return threads;
    };

    const displayedThreads = activeMainTab === 'tickets' ? getTickets() : getInbox();

    const [editingTicket, setEditingTicket] = useState(null);

    // ...

    const handleSaveTicket = async (ticketData) => {
        try {
            if (!user) return;

            if (editingTicket) {
                // Update existing ticket
                const { error } = await supabase
                    .from('app_support_messages')
                    .update({
                        title: ticketData.title,
                        priority: ticketData.priority,
                        category: ticketData.category,
                        status: ticketData.status,
                        public_visible: ticketData.public_visible,
                        content: ticketData.content // Allow updating content/description too
                    })
                    .eq('id', editingTicket.id);

                if (error) throw error;
            } else {
                // Create new ticket
                const { error } = await supabase.from('app_support_messages').insert({
                    user_id: user.id,
                    content: ticketData.content,
                    title: ticketData.title,
                    priority: ticketData.priority,
                    category: ticketData.category,
                    status: ticketData.status,
                    public_visible: ticketData.public_visible,
                    from_admin: true,
                    message_type: 'text',
                    is_ticket: true
                });
                if (error) throw error;
            }

            // Refresh and close
            loadThreads();
            setCreateModalVisible(false);
            setEditingTicket(null);
        } catch (error) {
            console.error('Error saving ticket:', error);
            alert('Failed to save ticket');
        }
    };

    const handleTicketPress = (item) => {
        if (activeMainTab === 'tickets') {
            setEditingTicket(item);
            setCreateModalVisible(true);
        } else {
            router.push(`/admin/support-thread/${item.userId}`);
        }
    };

    const renderThread = ({ item }) => (
        <Pressable
            style={styles.threadItem}
            onPress={() => handleTicketPress(item)}
        >
            <View style={styles.avatar}>
                {/* ... keep existing avatar code ... */}
                <Text style={styles.avatarText}>
                    {item.userName.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.threadInfo}>
                {/* ... keep existing thread info code ... */}
                <View style={styles.threadHeader}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userName}>{item.userName}</Text>
                        {item.priority && (
                            <View style={[styles.priorityTag, { backgroundColor: PRIORITY_COLORS[item.priority] }]}>
                                <Text style={styles.priorityText}>{item.priority}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.time}>
                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                        })}
                    </Text>
                </View>

                {item.title && (
                    <Text style={styles.threadTitle} numberOfLines={1}>{item.title}</Text>
                )}

                <View style={styles.metaRow}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.isFromAdmin && 'You: '}{item.lastMessage}
                    </Text>
                    {item.status && (
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{STATUS_LABELS[item.status] || item.status}</Text>
                        </View>
                    )}
                </View>
            </View>
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
                <Text style={styles.headerTitle}>Support Dashboard</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.mainTabs}>
                <Pressable
                    style={[styles.mainTab, activeMainTab === 'inbox' && styles.mainTabActive]}
                    onPress={() => setActiveMainTab('inbox')}
                >
                    <Text style={[styles.mainTabText, activeMainTab === 'inbox' && styles.mainTabTextActive]}>
                        Inbox
                    </Text>
                </Pressable>
                <Pressable
                    style={[styles.mainTab, activeMainTab === 'tickets' && styles.mainTabActive]}
                    onPress={() => setActiveMainTab('tickets')}
                >
                    <Text style={[styles.mainTabText, activeMainTab === 'tickets' && styles.mainTabTextActive]}>
                        Tickets
                    </Text>
                    <View style={styles.ticketCountBadge}>
                        <Text style={styles.ticketCountText}>
                            {tickets.filter(t => t.status !== 'fixed' && t.status !== 'wontfix').length}
                        </Text>
                    </View>
                </Pressable>
            </View>

            {activeMainTab === 'tickets' && (
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <AlertCircle size={16} color={SOUP_COLORS.red} />
                        <Text style={styles.statText}>{stats.urgent} urgent</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Wrench size={16} color={SOUP_COLORS.yellow} />
                        <Text style={styles.statText}>{stats.bugs} bugs</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Lightbulb size={16} color={SOUP_COLORS.green} />
                        <Text style={styles.statText}>{stats.requests} requests</Text>
                    </View>
                </View>
            )}

            {activeMainTab === 'inbox' && (
                <View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
                        <Pressable
                            style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
                            onPress={() => setActiveFilter('all')}
                        >
                            <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                                📋 All
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[styles.filterTab, activeFilter === 'unread' && styles.filterTabActive]}
                            onPress={() => setActiveFilter('unread')}
                        >
                            <Text style={[styles.filterTabText, activeFilter === 'unread' && styles.filterTabTextActive]}>
                                🔔 Unread
                            </Text>
                        </Pressable>
                    </ScrollView>
                </View>
            )}

            <FlatList
                data={displayedThreads}
                renderItem={renderThread}
                keyExtractor={item => activeMainTab === 'tickets' ? item.id : item.userId}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MessageCircle size={48} color="#CCC" />
                        <Text style={styles.emptyText}>No messages found</Text>
                    </View>
                }
            />

            <Pressable
                style={styles.fab}
                onPress={() => setCreateModalVisible(true)}
            >
                <Plus size={24} color="#fff" />
            </Pressable>

            <TicketModal
                visible={createModalVisible}
                onClose={() => {
                    setCreateModalVisible(false);
                    setEditingTicket(null);
                }}
                onSuccess={() => {
                    loadThreads(); // Refresh list after save
                    setCreateModalVisible(false);
                    setEditingTicket(null);
                }}
                ticketToEdit={editingTicket}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
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
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    backButton: {
        padding: 4,
    },
    mainTabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    mainTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    mainTabActive: {
        borderBottomWidth: 2,
        borderBottomColor: SOUP_COLORS.blue,
    },
    mainTabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#999',
    },
    mainTabTextActive: {
        color: SOUP_COLORS.blue,
    },
    ticketCountBadge: {
        backgroundColor: SOUP_COLORS.red,
        borderRadius: 10,
        paddingHorizontal: 5,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ticketCountText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    statsBar: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 16,
        backgroundColor: '#FAFAFA',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    filterTabs: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
        maxHeight: 60,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#F2F2F7',
        marginRight: 8,
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: SOUP_COLORS.blue,
    },
    filterTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    filterTabTextActive: {
        color: '#fff',
    },
    filterBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingHorizontal: 4,
        height: 16,
        justifyContent: 'center',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    list: {
        padding: 16,
    },
    threadItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
    },
    threadInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    threadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    priorityTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    time: {
        fontSize: 12,
        color: '#999',
    },
    threadTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
    },
    statusText: {
        fontSize: 10,
        color: '#666',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        gap: 12,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
    },
});
