import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Pressable, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Megaphone, MessageCircle, Users, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
// Brand Colors
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    card: '#ffffff',
    red: '#FF3B30',
    yellow: '#FFCC00',
};

export default function CommunityScreen() {
    const router = useRouter();
    const [announcements, setAnnouncements] = useState([]);
    const [activeGroups, setActiveGroups] = useState([]);
    const [memberCount, setMemberCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});
    const [knownIssues, setKnownIssues] = useState([]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        // Realtime updates for announcements and tickets
        const channel = supabase
            .channel('community-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_community_announcements' }, loadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_support_messages' }, loadData)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const loadData = async () => {
        try {
            // Load announcements
            const { data: announcementData } = await supabase
                .from('app_community_announcements')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(5);
            setAnnouncements(announcementData || []);

            // Load Known Issues
            const { data: issuesData } = await supabase
                .from('app_support_messages')
                .select('id, title, priority, category, status')
                .eq('public_visible', true)
                // Showing all statuses including fixed to show progress
                .order('created_at', { ascending: false })
                .limit(10);

            // Actually, let's show all open public issues but maybe limit if too many.
            setKnownIssues(issuesData || []);

            // Load active groups (by member count)
            const { data: groupData } = await supabase
                .from('app_groups')
                .select('*')
                .order('member_count', { ascending: false })
                .limit(6);
            setActiveGroups(groupData || []);

            // Get total member count
            const { count } = await supabase
                .from('app_users')
                .select('*', { count: 'exact', head: true });
            setMemberCount(count || 0);

        } catch (error) {
            console.error('Error loading community data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderAnnouncement = ({ item }) => (
        <View style={styles.announcementCard}>
            <View style={styles.announcementIcon}>
                <Megaphone size={14} color="#fff" />
            </View>
            <Text style={styles.announcementText} numberOfLines={2}>{item.content}</Text>
        </View>
    );

    const renderIssue = ({ item }) => (
        <View style={styles.issueCard}>
            <View style={[styles.issueBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.issueBadgeText}>{item.priority || 'Bug'}</Text>
            </View>
            <Text style={styles.issueTitle} numberOfLines={2}>{item.title || 'Untitled Issue'}</Text>
            <Text style={styles.issueStatus}>{item.status}</Text>
        </View>
    );

    const renderGroup = ({ item }) => (
        <Pressable
            style={styles.groupCard}
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.groupAvatar}>
                <Text style={styles.groupEmoji}>{item.emoji || '🥣'}</Text>
            </View>
            <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.memberRow}>
                <Users size={12} color={SOUP_COLORS.subtext} />
                <Text style={styles.memberText}>{item.member_count || 0}</Text>
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
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community Hub 🌍</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Community Chat Card */}
                <Pressable
                    style={styles.chatCard}
                    onPress={() => router.push('/community-chat')}
                >
                    <View style={styles.chatCardLeft}>
                        <View style={styles.chatIcon}>
                            <MessageCircle size={24} color="#fff" />
                        </View>
                        <View style={styles.chatInfo}>
                            <Text style={styles.chatTitle}>Community Chat</Text>
                            <View style={styles.chatMeta}>
                                <Users size={14} color={SOUP_COLORS.subtext} />
                                <Text style={styles.chatMetaText}>{memberCount} members • Tap to join</Text>
                            </View>
                        </View>
                    </View>
                    <ChevronRight size={24} color={SOUP_COLORS.subtext} />
                </Pressable>

                {/* Known Issues / Roadmap */}
                {knownIssues.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🛠️ Bugs we're working on</Text>
                        <FlatList
                            data={knownIssues}
                            renderItem={renderIssue}
                            keyExtractor={item => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.groupsList}
                        />
                    </View>
                )}

                {/* Active Groups */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔥 Most Active Groups</Text>
                    <FlatList
                        data={activeGroups}
                        renderItem={renderGroup}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.groupsList}
                    />
                </View>

                {/* Admin Announcements */}
                {announcements.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📣 Admin Announcements</Text>
                        {announcements.map(item => {
                            const isLong = item.content.length > 100;
                            const isExpanded = expandedAnnouncements[item.id];
                            const displayText = (isLong && !isExpanded)
                                ? item.content.substring(0, 100) + '...'
                                : item.content;

                            return (
                                <Pressable
                                    key={item.id}
                                    style={styles.fullAnnouncementCard}
                                    onPress={() => {
                                        if (isLong) {
                                            setExpandedAnnouncements(prev => ({
                                                ...prev,
                                                [item.id]: !prev[item.id]
                                            }));
                                        }
                                    }}
                                >
                                    <View style={styles.announcementIconLarge}>
                                        <Megaphone size={18} color="#fff" />
                                    </View>
                                    <View style={styles.announcementContent}>
                                        <Text style={styles.announcementFullText}>{displayText}</Text>
                                        {isLong && (
                                            <Text style={styles.readMoreText}>
                                                {isExpanded ? 'Show less' : 'Read more'}
                                            </Text>
                                        )}
                                        <Text style={styles.announcementDate}>
                                            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
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
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    scrollContent: {
        paddingBottom: 100,
    },

    // Chat Card
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    chatCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    chatIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    chatMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chatMetaText: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },

    // Sections
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        paddingHorizontal: 16,
        marginBottom: 12,
    },

    // Announcements
    announcementsList: {
        paddingHorizontal: 16,
    },
    announcementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        marginRight: 12,
        maxWidth: 280,
        gap: 12,
    },
    announcementIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    announcementText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: SOUP_COLORS.text,
        lineHeight: 20,
    },

    // Groups
    groupsList: {
        paddingHorizontal: 16,
    },
    groupCard: {
        backgroundColor: '#fff',
        width: 110,
        padding: 14,
        borderRadius: 18,
        alignItems: 'center',
        marginRight: 12,
    },
    groupAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: SOUP_COLORS.cream,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    groupEmoji: {
        fontSize: 26,
    },
    groupName: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        textAlign: 'center',
        marginBottom: 6,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },

    // Full Announcement Cards
    fullAnnouncementCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        gap: 14,
    },
    announcementIconLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    announcementContent: {
        flex: 1,
    },
    announcementFullText: {
        fontSize: 15,
        fontWeight: '500',
        color: SOUP_COLORS.text,
        lineHeight: 22,
        marginBottom: 6,
    },
    announcementDate: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    readMoreText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        marginTop: 6,
        marginBottom: 4,
    },

    // Issue Cards
    issueCard: {
        backgroundColor: '#fff',
        width: 160,
        padding: 12,
        borderRadius: 16,
        marginRight: 12,
        justifyContent: 'space-between',
        height: 110,
    },
    issueBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    issueBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    issueTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        lineHeight: 18,
        flex: 1,
    },
    issueStatus: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
        marginTop: 6,
        textTransform: 'capitalize',
    },
});

function getPriorityColor(p) {
    switch (p) {
        case 'P0': return SOUP_COLORS.red || '#FF3B30';
        case 'P1': return SOUP_COLORS.yellow || '#FFCC00';
        case 'P2': return SOUP_COLORS.green || '#19b091';
        default: return '#ccc';
    }
}
