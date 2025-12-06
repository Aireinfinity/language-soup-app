import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Text, Image, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MessageCircle, Users, Sparkles } from 'lucide-react-native';
import LanguageRequestModal from '../../components/LanguageRequestModal';
import { FloatingSupportButton } from '../../components/FloatingSupportButton';

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

    useFocusEffect(
        useCallback(() => {
            if (user) {
                loadGroups();
            }
        }, [user])
    );

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

    const handleLanguageRequest = async (language, message) => {
        try {
            // 1. Insert into language_requests table
            const { error: requestError } = await supabase
                .from('app_language_requests')
                .insert({
                    user_id: user.id,
                    language,
                    message,
                    status: 'pending'
                });

            if (requestError) throw requestError;

            // 2. Find or create support group
            let supportGroupId = null;

            // Check if user already has a support group
            const { data: existingMembership } = await supabase
                .from('app_group_members')
                .select('group_id, app_groups!inner(id, language)')
                .eq('user_id', user.id)
                .eq('app_groups.language', 'Support')
                .single();

            if (existingMembership) {
                supportGroupId = existingMembership.group_id;
            }

            // 3. Send message to support group
            if (supportGroupId) {
                await supabase
                    .from('app_messages')
                    .insert({
                        group_id: supportGroupId,
                        sender_id: user.id,
                        content: `📩 New Language Request: ${language}\n\n${message ? `Message: ${message}\n\n` : ''}Status: Pending review`,
                        message_type: 'text'
                    });
            }

            // 4. Close modal and show success
            setShowRequestModal(false);

            // Refresh groups to show updated support chat
            await loadGroups();

            // Optional: Navigate to support tab
            // router.push('/(tabs)/support');

        } catch (error) {
            console.error('Error submitting language request:', error);
            alert('Failed to submit request. Please try again.');
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
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>
                    {item.name.charAt(0).toUpperCase()}
                </Text>
            </View>

            <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                    <ThemedText style={styles.groupName}>{item.name}</ThemedText>
                    {item.lastMessage && (
                        <Text style={styles.time}>{formatTime(item.lastMessage.time)}</Text>
                    )}
                </View>

                <View style={styles.groupFooter}>
                    {item.lastMessage ? (
                        <Text style={styles.lastMessage} numberOfLines={1}>
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

                <View style={styles.groupMeta}>
                    <Users size={14} color={Colors.textLight} />
                    <Text style={styles.memberCount}>{item.memberCount} members</Text>
                </View>
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
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Image
                        source={require('../../assets/images/logo.png')}
                        style={styles.headerLogo}
                        resizeMode="contain"
                    />
                    <View style={styles.headerTextContainer}>
                        <ThemedText style={styles.title}>your soup</ThemedText>
                        <Text style={styles.subtitle}>language practice, served daily</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={groups}
                renderItem={renderGroup}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
                        <Pressable
                            style={styles.requestButton}
                            onPress={() => {
                                setShowRequestModal(true);
                            }}
                        >
                            <View style={styles.requestIconContainer}>
                                <Sparkles size={24} color={SOUP_COLORS.blue} />
                            </View>
                            <View style={styles.requestTextContainer}>
                                <Text style={styles.requestTitle}>Request a Language</Text>
                                <Text style={styles.requestSubtext}>Don't see your language? Let us know!</Text>
                            </View>
                        </Pressable>
                    ) : null
                }
            />

            <LanguageRequestModal
                visible={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onSubmit={handleLanguageRequest}
            />

            {/* Floating Support Button (for non-admin users) */}
            {user?.role !== 'admin' && (
                <FloatingSupportButton
                    onPress={() => router.push('/support-chat')}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // cream
        paddingTop: Platform.OS === 'ios' ? 44 : 0,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerLogo: {
        width: 56,
        height: 56,
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.primary,
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textLight,
        fontWeight: '500',
    },
    list: {
        paddingVertical: 8,
    },
    groupItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    groupAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupAvatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    groupInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
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
    unreadBadge: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginLeft: 8,
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
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: SOUP_COLORS.blue,
        alignItems: 'center',
    },
    requestIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E3F2FD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    requestTextContainer: {
        flex: 1,
    },
    requestTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 2,
    },
    requestSubtext: {
        fontSize: 14,
        color: Colors.textLight,
    },
});
