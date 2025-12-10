import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Users, MessageSquare, Calendar, TrendingUp, Bell, Plus, UserPlus, Award } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ff6b9d',
    yellow: '#ffd93d',
    green: '#6bcf7f',
    cream: '#fffbf5',
    subtext: '#666',
};

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers7d: 0,
        voiceMemosThisWeek: 0,
        unreadSupport: 0,
        groupStats: []
    });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            // ... (keep existing stats queries) ...
            // Total users
            const { count: totalUsers } = await supabase
                .from('app_users')
                .select('*', { count: 'exact', head: true });

            // Active users (last 7 days)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: activeUserIds } = await supabase
                .from('app_messages')
                .select('sender_id')
                .gte('created_at', sevenDaysAgo.toISOString());
            const uniqueActiveUsers = new Set(activeUserIds?.map(m => m.sender_id) || []);

            // Voice messages stats
            const { count: voiceMemos } = await supabase
                .from('app_messages')
                .select('*', { count: 'exact', head: true })
                .eq('message_type', 'voice')
                .gte('created_at', sevenDaysAgo.toISOString());

            // Group stats
            const { data: groups } = await supabase
                .from('app_groups')
                .select('id, name, member_count')
                .order('member_count', { ascending: false });

            // Unread Support Threads
            // Logic: Count unique users where the LAST message is NOT from admin (needs reply)
            const { data: supportMessages } = await supabase
                .from('app_support_messages')
                .select('user_id, from_admin, created_at')
                .order('created_at', { ascending: false }); // Newest first

            const unreadThreads = new Set();
            const checkedUsers = new Set();

            supportMessages?.forEach(msg => {
                if (!checkedUsers.has(msg.user_id)) {
                    // Check the very first message encountered for this user (which is the newest)
                    checkedUsers.add(msg.user_id);
                    if (!msg.from_admin) {
                        unreadThreads.add(msg.user_id);
                    }
                }
            });

            // Pending Language Requests
            const { count: pendingRequests } = await supabase
                .from('app_language_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            setStats({
                totalUsers: totalUsers || 0,
                activeUsers7d: uniqueActiveUsers.size,
                voiceMemosThisWeek: voiceMemos || 0,
                unreadSupport: unreadThreads.size,
                pendingRequests: pendingRequests || 0,
                groupStats: groups || []
            });

        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, color }) => (
        <View style={[styles.statCard, { borderLeftColor: color }]}>
            <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.statContent}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );

    const MenuItem = ({ icon: Icon, label, onPress, color = SOUP_COLORS.blue, badge }) => (
        <Pressable
            style={({ pressed }) => [
                styles.menuItem,
                pressed && { opacity: 0.7 }
            ]}
            onPress={onPress}
        >
            <View style={[styles.menuIcon, { backgroundColor: `${color}20` }]}>
                <Icon size={22} color={color} />
                {badge > 0 && (
                    <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{badge}</Text>
                    </View>
                )}
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
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
                <Text style={styles.headerTitle}>Founder Daddy Dashboard</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
                    <View style={styles.menuGrid}>
                        <MenuItem
                            icon={TrendingUp}
                            label="Manage Challenges"
                            color={SOUP_COLORS.yellow}
                            onPress={() => router.push('/admin/create-challenge')}
                        />
                        <MenuItem
                            icon={Users}
                            label="Manage Groups"
                            color={SOUP_COLORS.green}
                            onPress={() => router.push('/admin/manage-groups')}
                        />
                        <MenuItem
                            icon={UserPlus}
                            label="Community Managers"
                            color={SOUP_COLORS.pink}
                            onPress={() => router.push('/admin/manage-community-managers')}
                        />
                        <MenuItem
                            icon={Bell}
                            label="Language Requests"
                            color="#FF7675"
                            onPress={() => router.push('/admin/language-requests')}
                            badge={stats.pendingRequests}
                            badgeColor={SOUP_COLORS.red}
                        />
                    </View>
                </View>

                {/* Stats Overview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Overview</Text>
                    <StatCard
                        icon={Users}
                        label="Total Users"
                        value={stats.totalUsers}
                        color={SOUP_COLORS.blue}
                    />
                    <StatCard
                        icon={TrendingUp}
                        label="Active (7 days)"
                        value={stats.activeUsers7d}
                        color={SOUP_COLORS.green}
                    />
                    <StatCard
                        icon={MessageSquare}
                        label="Voice Memos (This Week)"
                        value={stats.voiceMemosThisWeek}
                        color={SOUP_COLORS.pink}
                    />
                </View>

                {/* Group Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👥 Groups</Text>
                    {stats.groupStats.map((group) => (
                        <View key={group.id} style={styles.groupRow}>
                            <Text style={styles.groupName}>{group.name}</Text>
                            <Text style={styles.groupCount}>{group.member_count} members</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
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
    content: {
        flex: 1,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        color: '#000',
    },
    statCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    statContent: {
        flex: 1,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    groupRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 8,
    },
    groupName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    groupCount: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    menuItem: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    menuIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    menuLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    },
    menuBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    menuBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
});
