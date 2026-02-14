import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { haptics } from '../utils/haptics';
import GroupAvatar from '../components/GroupAvatar';
import { getAvatarSource } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

export default function YourGroupsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);

    const loadGroups = useCallback(async () => {
        if (!user?.id) return;
        try {
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
                setRefreshing(false);
                return;
            }

            const groupIds = memberships.map(m => m.app_groups?.id).filter(Boolean);
            if (groupIds.length === 0) {
                setGroups([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }
            const lastReadByGroup = new Map(memberships.map(m => [m.app_groups?.id, m.last_read_at || '1970-01-01']));

            const { data: allMessages, error: msgError } = await supabase
                .from('app_messages')
                .select('id, group_id, content, created_at, message_type, sender_id')
                .in('group_id', groupIds)
                .order('created_at', { ascending: false })
                .limit(400);

            if (msgError) throw msgError;

            const lastMessageByGroup = {};
            const unreadCountByGroup = {};
            groupIds.forEach(gid => { unreadCountByGroup[gid] = 0; });
            const recentSenderIdsByGroup = {};
            for (const msg of allMessages || []) {
                const gid = msg.group_id;
                if (!lastMessageByGroup[gid]) lastMessageByGroup[gid] = msg;
                const lastRead = lastReadByGroup.get(gid) || '1970-01-01';
                if (msg.created_at > lastRead && msg.sender_id !== user.id) {
                    unreadCountByGroup[gid] = (unreadCountByGroup[gid] || 0) + 1;
                }
                if (msg.sender_id === user.id) continue;
                const arr = recentSenderIdsByGroup[gid] || (recentSenderIdsByGroup[gid] = []);
                if (arr.length < 3 && !arr.includes(msg.sender_id)) arr.push(msg.sender_id);
            }

            const senderIds = [...new Set(Object.values(lastMessageByGroup).map(m => m.sender_id).filter(Boolean))];
            const recentSpeakerIds = [...new Set(Object.values(recentSenderIdsByGroup).flat())];
            const allSenderIds = [...new Set([...senderIds, ...recentSpeakerIds])];
            const senderNames = {};
            const senderAvatars = {};
            if (allSenderIds.length > 0) {
                const { data: senders } = await supabase.from('app_users').select('id, display_name, avatar_url').in('id', allSenderIds);
                (senders || []).forEach(s => {
                    senderNames[s.id] = s.display_name || 'Unknown';
                    senderAvatars[s.id] = s.avatar_url ?? null;
                });
            }

            let groupsWithDetails = memberships.map((membership) => {
                const group = membership.app_groups;
                if (!group) return null;
                const lastMsg = lastMessageByGroup[group.id];
                const recentIds = (recentSenderIdsByGroup[group.id] || []).filter(sid => sid !== '00000000-0000-0000-0000-000000000000');
                const recentSpeakers = recentIds.map(sid => ({
                    id: sid,
                    display_name: senderNames[sid] || 'Unknown',
                    avatar_url: senderAvatars[sid] ?? null,
                }));
                return {
                    id: group.id,
                    name: group.name,
                    language: group.language,
                    level: group.level,
                    memberCount: group.member_count || 0,
                    avatarUrl: group.avatar_url,
                    recentSpeakers,
                    lastMessage: lastMsg ? {
                        content: lastMsg.content,
                        type: lastMsg.message_type,
                        senderName: senderNames[lastMsg.sender_id] || 'Unknown',
                        time: lastMsg.created_at
                    } : null,
                    unreadCount: unreadCountByGroup[group.id] || 0
                };
            }).filter(Boolean);

            groupsWithDetails.sort((a, b) => {
                const timeA = a.lastMessage?.time ? new Date(a.lastMessage.time).getTime() : 0;
                const timeB = b.lastMessage?.time ? new Date(b.lastMessage.time).getTime() : 0;
                return timeB - timeA;
            });

            const dmGroups = groupsWithDetails.filter(g => g.name === 'DM' && g.memberCount === 2);
            const dmGroupIds = dmGroups.map(g => g.id);
            if (dmGroupIds.length > 0) {
                const { data: partners } = await supabase
                    .from('app_group_members')
                    .select('group_id, app_users(display_name, avatar_url)')
                    .in('group_id', dmGroupIds)
                    .neq('user_id', user.id);
                const partnerMap = {};
                partners?.forEach(p => { if (p.app_users) partnerMap[p.group_id] = p.app_users; });
                groupsWithDetails.forEach(g => {
                    if (g.name === 'DM' && g.memberCount === 2) {
                        g.isDM = true;
                        g.partner = partnerMap[g.id] || { display_name: 'Unknown User', avatar_url: null };
                    }
                });
            }

            const BOT_ID = '00000000-0000-0000-0000-000000000000';
            const groupsNeedingMemberFaces = groupsWithDetails.filter(g => !g.isDM && (!g.recentSpeakers || g.recentSpeakers.length === 0));
            if (groupsNeedingMemberFaces.length > 0) {
                const groupIdsNeeding = groupsNeedingMemberFaces.map(g => g.id);
                const { data: memberRows } = await supabase
                    .from('app_group_members')
                    .select('group_id, user_id')
                    .in('group_id', groupIdsNeeding)
                    .neq('user_id', user.id)
                    .neq('user_id', BOT_ID);
                const memberIdsByGroup = {};
                (memberRows || []).forEach(row => {
                    const arr = memberIdsByGroup[row.group_id] || (memberIdsByGroup[row.group_id] = []);
                    if (arr.length < 3 && !arr.includes(row.user_id)) arr.push(row.user_id);
                });
                const allMemberIds = [...new Set(Object.values(memberIdsByGroup).flat())];
                let memberProfiles = {};
                if (allMemberIds.length > 0) {
                    const { data: profiles } = await supabase.from('app_users').select('id, display_name, avatar_url').in('id', allMemberIds);
                    (profiles || []).forEach(p => { memberProfiles[p.id] = p; });
                }
                groupsWithDetails.forEach(g => {
                    if (!g.isDM && (!g.recentSpeakers || g.recentSpeakers.length === 0)) {
                        const ids = memberIdsByGroup[g.id] || [];
                        g.groupMemberFaces = ids.map(sid => ({
                            id: sid,
                            display_name: memberProfiles[sid]?.display_name || 'Unknown',
                            avatar_url: memberProfiles[sid]?.avatar_url ?? null,
                        }));
                    }
                });
            }

            setGroups(groupsWithDetails);
            setLoadError(false);
        } catch (error) {
            console.error('Error loading groups:', error);
            setLoadError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            loadGroups();
        }, [loadGroups])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadGroups();
    }, [loadGroups]);

    const onPressGroup = useCallback((item) => {
        if (!item?.id) {
            Alert.alert("Couldn't open chat", "This group couldn't be opened. Please try again or pull to refresh.");
            return;
        }
        try { haptics.light(); } catch (_) {}
        setGroups(prev => prev.map(g => (g.id === item.id ? { ...g, unreadCount: 0 } : g)));
        router.push(`/chat/${item.id}`);
    }, [router]);

    const renderItem = ({ item }) => (
        <Pressable
            style={({ pressed }) => [
                styles.row,
                item.unreadCount > 0 && styles.rowUnread,
                pressed && { opacity: 0.9 },
            ]}
            onPress={() => onPressGroup(item)}
        >
            <View style={styles.avatarWrap}>
                {item.isDM ? (
                    <Image source={getAvatarSource(item.partner?.avatar_url)} style={styles.avatar} />
                ) : (item.recentSpeakers?.length > 0 || item.groupMemberFaces?.length > 0) ? (
                    <View style={styles.recentSpeakersRow}>
                        {(item.recentSpeakers?.length > 0 ? item.recentSpeakers : item.groupMemberFaces).slice(0, 3).map((person, i) => (
                            <View key={person.id} style={[styles.recentSpeakerWrap, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}>
                                {person.avatar_url ? (
                                    <Image source={getAvatarSource(person.avatar_url)} style={styles.recentSpeakerAvatar} />
                                ) : (
                                    <View style={[styles.recentSpeakerAvatar, styles.placeholderAvatar]}>
                                        <Text style={styles.placeholderText}>{person.display_name?.[0]?.toUpperCase() || '?'}</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <GroupAvatar language={item.language} size={48} />
                )}
                {item.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: SOUP_COLORS.pink }]}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                )}
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.rowName} numberOfLines={1}>
                    {item.isDM ? (item.partner?.display_name || 'User') : item.name}
                </Text>
                <Text style={styles.rowPreview} numberOfLines={1}>
                    {item.lastMessage
                        ? (item.lastMessage.type === 'voice' ? '🎤 voice' : item.lastMessage.content || '')
                        : 'no messages yet'}
                </Text>
            </View>
            <ChevronRight size={20} color={SOUP_COLORS.subtext} />
        </Pressable>
    );

    if (loading && groups.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.9 }]}>
                        <ArrowLeft size={24} color={SOUP_COLORS.text} />
                    </Pressable>
                    <Text style={styles.headerTitle}>your groups</Text>
                </View>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.9 }]}>
                    <ArrowLeft size={24} color={SOUP_COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>your groups</Text>
            </View>

            {loadError ? (
                <View style={styles.errorWrap}>
                    <Text style={styles.errorText}>couldn't load groups</Text>
                    <Pressable style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.9 }]} onPress={() => { setLoadError(false); loadGroups(); }}>
                        <Text style={styles.retryButtonText}>try again</Text>
                    </Pressable>
                </View>
            ) : groups.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <Text style={styles.emptyEmoji}>🥣</Text>
                    <Text style={styles.emptyText}>no groups yet — add languages from home</Text>
                </View>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SOUP_COLORS.blue} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: 8,
        paddingBottom: 32,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 14,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
    },
    rowUnread: {
        borderLeftColor: SOUP_COLORS.blue,
    },
    avatarWrap: {
        width: 52,
        height: 52,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 14,
    },
    recentSpeakersRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    recentSpeakerWrap: {
        borderWidth: 2,
        borderColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    recentSpeakerAvatar: {
        width: 28,
        height: 28,
        borderRadius: 10,
    },
    placeholderAvatar: {
        backgroundColor: SOUP_COLORS.subtext,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    rowContent: {
        flex: 1,
        minWidth: 0,
    },
    rowName: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 2,
    },
    rowPreview: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
    },
    errorWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: 16,
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 16,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
    },
});
