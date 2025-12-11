import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Text, Image, Platform, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, Users, Sparkles, Plus, Globe, ChevronRight } from 'lucide-react-native';
import LanguageRequestModal from '../../components/LanguageRequestModal';
import { FloatingSupportButton } from '../../components/FloatingSupportButton';
import { haptics } from '../../utils/haptics';
import AdminLoginModal from '../../components/AdminLoginModal';
import HomeTutorial from '../../components/HomeTutorial';
import FounderWelcomeModal from '../../components/FounderWelcomeModal';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
};

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCommunityManager, setIsCommunityManager] = useState(false);
    const [unreadSupportCount, setUnreadSupportCount] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [adminModeEnabled, setAdminModeEnabled] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    const [showFounderWelcome, setShowFounderWelcome] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (user) {
                checkAdminStatus();
                loadGroups();
            }
        }, [user])
    );

    useEffect(() => {
        checkTutorialStatus();
    }, []);

    const checkTutorialStatus = async () => {
        try {
            const hasSeen = await AsyncStorage.getItem('has_seen_home_tutorial_v1');
            console.log('Tutorial check:', hasSeen);
            if (hasSeen !== 'true') {
                // Short delay to let the screen load
                setTimeout(() => {
                    setShowTutorial(true);
                }, 1500);
            }
        } catch (error) {
            console.error('Error checking tutorial status:', error);
        }
    };

    const handleTutorialClose = async () => {
        setShowTutorial(false);
        try {
            await AsyncStorage.setItem('has_seen_home_tutorial_v1', 'true');
        } catch (error) {
            console.error('Error saving tutorial status:', error);
        }
    };

    // Realtime updates for Admin Badges
    useEffect(() => {
        if (!isAdmin) return;
        console.log('Setting up admin realtime subscription');

        const channel = supabase
            .channel('admin-badge-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_support_messages' }, (payload) => {
                console.log('Realtime support message update:', payload);
                fetchAdminStats();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_language_requests' }, (payload) => {
                console.log('Realtime language request update:', payload);
                fetchAdminStats();
            })
            .subscribe((status) => {
                console.log('Subscription status:', status);
            });

        return () => {
            console.log('Removing admin realtime subscription');
            supabase.removeChannel(channel);
        };
    }, [isAdmin]);

    const checkAdminStatus = async () => {
        if (!user) return;

        try {
            // 1. Get current status
            const { data } = await supabase
                .from('app_users')
                .select('display_name, is_admin, is_community_manager')
                .eq('id', user.id)
                .single();

            // 2. AUTO-PROMOTE NOAH :)
            if (data?.display_name === 'Noah :)' && !data.is_admin) {
                console.log('👑 Auto-promoting Founder Daddy...');
                const { error: updateError } = await supabase
                    .from('app_users')
                    .update({
                        is_admin: true,
                        is_community_manager: true
                    })
                    .eq('id', user.id);

                if (!updateError) {
                    setIsAdmin(true);
                    setIsCommunityManager(true);
                    fetchAdminStats();
                    return;
                }
            }

            console.log('Admin check:', data);
            if (data) {
                setIsAdmin(data.is_admin || false);
                setIsCommunityManager(data.is_community_manager || false);
                if (data.is_admin) {
                    fetchAdminStats();
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    };

    const fetchAdminStats = async () => {
        try {
            // Count unread support threads
            const { data: supportMessages } = await supabase
                .from('app_support_messages')
                .select('user_id, from_admin')
                .order('created_at', { ascending: false });

            const unreadThreads = new Set();
            const checkedUsers = new Set();

            supportMessages?.forEach(msg => {
                if (!checkedUsers.has(msg.user_id)) {
                    checkedUsers.add(msg.user_id);
                    if (!msg.from_admin) {
                        unreadThreads.add(msg.user_id);
                    }
                }
            });
            console.log('Final Unread Threads:', unreadThreads.size);
            setUnreadSupportCount(unreadThreads.size);

            // Count pending language requests
            const { count: pendingRequests } = await supabase
                .from('app_language_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            setPendingRequestsCount(pendingRequests || 0);

        } catch (error) {
            console.error('Error fetching admin stats:', error);
        }
    };

    const loadGroups = async () => {
        try {
            // Get groups the user is a member of
            const { data: memberships, error: memberError } = await supabase
                .from('app_group_members')
                .select(`
                    group_id,
                    last_read_at,
                    app_groups (
                        id,
                        name,
                        language,
                        level,
                        member_count,
                        avatar_url
                    )
                `)
                .eq('user_id', user.id);

            if (memberError) throw memberError;

            if (!memberships || memberships.length === 0) {
                setGroups([]);
                setLoading(false);
                return;
            }

            // Get last message and unread count for each group
            const groupsWithDetails = await Promise.all(
                memberships.map(async (membership) => {
                    const group = membership.app_groups;

                    // Get last message
                    const { data: lastMessage } = await supabase
                        .from('app_messages')
                        .select('content, created_at, message_type, sender:app_users!sender_id(display_name)')
                        .eq('group_id', group.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    // Get unread count (messages after last_read_at)
                    const { count: unreadCount } = await supabase
                        .from('app_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', group.id)
                        .gt('created_at', membership.last_read_at || '1970-01-01');

                    return {
                        id: group.id,
                        name: group.name,
                        language: group.language,
                        level: group.level,
                        memberCount: group.member_count || 0,
                        avatarUrl: group.avatar_url,
                        lastMessage: lastMessage ? {
                            content: lastMessage.content,
                            type: lastMessage.message_type,
                            senderName: lastMessage.sender?.display_name || 'Unknown',
                            time: lastMessage.created_at
                        } : null,
                        unreadCount: unreadCount || 0
                    };
                })
            );

            // Sort by most recent message (newest first)
            groupsWithDetails.sort((a, b) => {
                const timeA = a.lastMessage?.time ? new Date(a.lastMessage.time).getTime() : 0;
                const timeB = b.lastMessage?.time ? new Date(b.lastMessage.time).getTime() : 0;
                return timeB - timeA; // Descending order (newest first)
            });

            setGroups(groupsWithDetails);
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadGroups();
        setRefreshing(false);
    };

    const handleLanguageRequest = async (requestText, unused) => {
        try {
            // Insert group request into database
            const { error: requestError } = await supabase
                .from('app_language_requests')
                .insert({
                    user_id: user.id,
                    language_name: requestText,
                    status: 'pending'
                });

            if (requestError) throw requestError;

            // Close modal and show success
            setShowRequestModal(false);
            Alert.alert('Success', 'Your group request has been submitted! We\'ll review it soon.');

        } catch (error) {
            console.error('Error submitting language request:', error);
            Alert.alert('Error', 'Failed to submit request. Please try again.');
        }
    };
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString();
    };

    const renderGroup = ({ item }) => (
        <Pressable
            style={styles.groupItem}
            onPress={() => {
                haptics.light();
                console.log('Navigating to chat:', item.id);
                router.push(`/chat/${item.id}`);
            }}
        >
            {/* Group Avatar with Members Badge */}
            <View style={styles.groupAvatarWrapper}>
                <View style={styles.groupAvatar}>
                    <Text style={styles.groupAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
                {/* Small group icon overlay */}
                <View style={styles.groupBadge}>
                    <Users size={12} color="#fff" />
                </View>
            </View>

            <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                    <View style={styles.groupTitleRow}>
                        <ThemedText style={styles.groupName}>{item.name}</ThemedText>
                        <View style={styles.memberBadge}>
                            <Users size={10} color={Colors.textLight} />
                            <Text style={styles.memberBadgeText}>{item.memberCount}</Text>
                        </View>
                    </View>
                    {item.lastMessage && (
                        <Text style={styles.time}>{formatTime(item.lastMessage.time)}</Text>
                    )}
                </View>

                <View style={styles.groupFooter}>
                    {item.lastMessage ? (
                        <Text style={styles.lastMessage} numberOfLines={1}>
                            <Text style={styles.senderNameInPreview}>{item.lastMessage.senderName}: </Text>
                            {item.lastMessage.type === 'voice' ? '🎤 Voice message' : item.lastMessage.content}
                        </Text>
                    ) : (
                        <Text style={styles.noMessages}>No messages yet</Text>
                    )}

                    {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* CTA Arrow */}
            <View style={styles.arrowContainer}>
                <ChevronRight size={20} color="#CFD8DC" />
            </View>
        </Pressable>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../../assets/images/logo.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                    <View style={styles.headerTextContainer}>
                        <ThemedText style={styles.title}>your soup</ThemedText>
                    </View>
                </View>
                <Pressable
                    style={styles.headerButton}
                    onPress={() => router.push('/browse-groups')}
                >
                    <Plus size={24} color={SOUP_COLORS.blue} />
                </Pressable>
            </View>

            <FlatList
                data={groups.filter(g => !g.name.toLowerCase().includes('support'))}
                renderItem={renderGroup}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListHeaderComponent={
                    (isAdmin || isCommunityManager) ? (
                        <View style={styles.adminSection}>
                            {/* Admin Cards Row - Side by side */}
                            {isAdmin && (
                                <View style={styles.adminCardRow}>
                                    <Pressable
                                        style={[styles.adminCardSmall, { backgroundColor: SOUP_COLORS.blue }]}
                                        onPress={() => router.push('/admin/dashboard')}
                                    >
                                        <Sparkles size={24} color="#fff" />
                                        <Text style={styles.adminCardSmallTitle}>Founder Daddy</Text>
                                    </Pressable>

                                    <Pressable
                                        style={[styles.adminCardSmall, { backgroundColor: SOUP_COLORS.pink }]}
                                        onPress={() => router.push('/admin/support')}
                                    >
                                        <MessageCircle size={24} color="#fff" />
                                        <Text style={styles.adminCardSmallTitle}>Fuck It's Not Working</Text>
                                    </Pressable>
                                </View>
                            )}

                            {/* Community Manager Dashboard - Only for community managers */}
                            {isCommunityManager && (
                                <Pressable
                                    style={styles.adminCard}
                                    onPress={() => router.push('/admin/community-dashboard')}
                                >
                                    <View style={[styles.adminCardIcon, { backgroundColor: SOUP_COLORS.green }]}>
                                        <Sparkles size={24} color="#fff" />
                                    </View>
                                    <View style={styles.adminCardInfo}>
                                        <Text style={[styles.adminCardTitle, { color: SOUP_COLORS.green }]}>Community Manager</Text>
                                        <Text style={styles.adminCardSubtitle}>Send challenges to your groups</Text>
                                    </View>
                                </Pressable>
                            )}
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🥣</Text>
                        <ThemedText style={styles.emptyTitle}>your soup is looking empty...</ThemedText>
                        <ThemedText style={styles.emptyText}>add some languages to get started!</ThemedText>
                        <Pressable
                            style={styles.addButton}
                            onPress={() => {
                                router.push('/group-selection');
                            }}
                        >
                            <ThemedText style={styles.addButtonText}>add languages</ThemedText>
                        </Pressable>
                    </View>
                }
                ListFooterComponent={
                    groups.length > 0 ? (
                        <View style={{ height: 120 }} />
                    ) : null
                }
            />

            <LanguageRequestModal
                visible={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onSubmit={handleLanguageRequest}
            />

            {/* Floating Request Group Button (left side) - Hide for admins */}
            {groups.length > 0 && !isAdmin && (
                <Pressable
                    style={styles.floatingRequestBtn}
                    onPress={() => setShowRequestModal(true)}
                >
                    <View style={styles.floatingRequestCircle}>
                        <Sparkles size={24} color="#fff" />
                    </View>
                    <Text style={styles.floatingRequestLabel}>request group</Text>
                </Pressable>
            )}

            {/* Floating Support Button (for non-admin users) */}
            {!isAdmin && (
                <FloatingSupportButton
                    onPress={() => router.push('/support-chat')}
                />
            )}

            {/* Admin Toggle Button (bottom right corner) */}
            <Pressable
                style={styles.adminToggleButton}
                onPress={() => {
                    if (adminModeEnabled) {
                        setAdminModeEnabled(false);
                        setIsAdmin(false);
                    } else {
                        setShowAdminModal(true);
                    }
                }}
            >
                <Text style={styles.adminToggleText}>
                    {adminModeEnabled ? '👤' : '🔐'}
                </Text>
            </Pressable>

            {/* Admin Password Modal */}
            <AdminLoginModal
                visible={showAdminModal}
                onClose={() => setShowAdminModal(false)}
                onSuccess={() => {
                    setAdminModeEnabled(true);
                    setIsAdmin(true);
                    setShowFounderWelcome(true); // TRIGGER THE EGO BOOST
                }}
            />

            <FounderWelcomeModal
                visible={showFounderWelcome}
                onClose={() => {
                    setShowFounderWelcome(false);
                    router.push('/(tabs)/profile'); // Navigate to profile after enjoying the praise
                }}
            />

            <HomeTutorial visible={showTutorial} onClose={handleTutorialClose} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // cream
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerLogo: {
        width: 52,
        height: 52,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: -0.5,
        lineHeight: 34,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textLight,
        fontWeight: '500',
        marginTop: 2,
    },
    browseButton: {
        padding: 8,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerButton: {
        padding: 8,
    },
    // Admin Section
    adminSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
        gap: 10,
    },
    adminCardRow: {
        flexDirection: 'row',
        gap: 12,
    },
    adminCardSmall: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    adminCardSmallTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    adminCardSmallSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
    },
    adminCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 14,
    },
    adminCardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    adminCardInfo: {
        flex: 1,
    },
    adminCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    adminCardSubtitle: {
        fontSize: 13,
        color: '#8E8E93',
    },
    list: {
        paddingVertical: 8,
    },
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
    },
    arrowContainer: {
        paddingLeft: 4,
        justifyContent: 'center',
    },
    groupAvatarWrapper: {
        position: 'relative',
        marginRight: 12,
    },
    groupAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupAvatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    groupBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: Colors.secondary,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    groupInfo: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: 8, // Add breathing room from arrow
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    groupTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginRight: 4, // Ensure title doesn't hit time
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    memberBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textLight,
    },
    time: {
        fontSize: 12,
        color: Colors.textLight,
    },
    groupFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    senderNameInPreview: {
        fontWeight: '600',
        color: Colors.text,
    },
    lastMessage: {
        fontSize: 14,
        color: Colors.textLight,
        flex: 1,
    },
    noMessages: {
        fontSize: 14,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    cardBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: SOUP_COLORS.red,
        borderRadius: 10,
        height: 20,
        minWidth: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 999, // Force on top
        elevation: 10,
    },
    unreadBadge: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 4,
        marginLeft: 4,
    },
    unreadText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    groupMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberCount: {
        fontSize: 12,
        color: Colors.textLight,
    },
    emptyState: {
        padding: 64,
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 72,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        marginBottom: 24,
    },
    addButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 24,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    requestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 24,
        gap: 14,
    },
    requestIcon: {
        marginRight: 4,
    },
    requestButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.green,
    },
    // Floating Request Group Button
    floatingRequestBtn: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        zIndex: 1000,
        alignItems: 'center',
    },
    floatingRequestCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    floatingRequestLabel: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.green,
        textAlign: 'center',
    },
});
