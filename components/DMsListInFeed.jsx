/**
 * DMs list shown in the feed when user picks "DMs" from the group picker.
 * Tap a conversation to open that DM in the same feed (no navigation).
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { haptics } from '../utils/haptics';
import { getAvatarSource } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

export function DMsListInFeed({ onSelectGroup }) {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadDMs = useCallback(async () => {
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
                        member_count,
                        avatar_url
                    )
                `)
                .eq('user_id', user.id);

            if (memberError) throw memberError;

            const dmMemberships = (memberships || []).filter(
                (m) => m.app_groups?.name === 'DM'
            );
            const dmGroupIds = dmMemberships.map((m) => m.app_groups.id).filter(Boolean);
            const lastReadByGroup = new Map(dmMemberships.map((m) => [m.app_groups?.id, m.last_read_at || '1970-01-01']));

            if (dmGroupIds.length === 0) {
                setConversations([]);
                return;
            }

            const { data: messages, error: msgError } = await supabase
                .from('app_messages')
                .select('id, group_id, content, created_at, message_type, sender_id')
                .in('group_id', dmGroupIds)
                .order('created_at', { ascending: false })
                .limit(200);

            if (msgError) throw msgError;

            const lastMessageByGroup = {};
            const unreadCountByGroup = {};
            dmGroupIds.forEach((gid) => { unreadCountByGroup[gid] = 0; });
            for (const msg of messages || []) {
                if (!lastMessageByGroup[msg.group_id]) lastMessageByGroup[msg.group_id] = msg;
                const lastRead = lastReadByGroup.get(msg.group_id) || '1970-01-01';
                if (msg.created_at > lastRead && msg.sender_id !== user.id) {
                    unreadCountByGroup[msg.group_id] = (unreadCountByGroup[msg.group_id] || 0) + 1;
                }
            }

            const { data: partners } = await supabase
                .from('app_group_members')
                .select('group_id, app_users(id, display_name, avatar_url, status_text)')
                .in('group_id', dmGroupIds)
                .neq('user_id', user.id);

            const partnerMap = {};
            (partners || []).forEach((p) => {
                const u = p.app_users;
                if (u) partnerMap[p.group_id] = Array.isArray(u) ? u[0] : u;
            });

            const senderIds = [...new Set(Object.values(lastMessageByGroup).map((m) => m.sender_id).filter(Boolean))];
            let senderNames = {};
            if (senderIds.length > 0) {
                const { data: senders } = await supabase.from('app_users').select('id, display_name').in('id', senderIds);
                (senders || []).forEach((s) => { senderNames[s.id] = s.display_name || 'Unknown'; });
            }

            const list = dmGroupIds.map((gid) => {
                const lastMsg = lastMessageByGroup[gid];
                const partner = partnerMap[gid] || { display_name: 'Unknown', avatar_url: null };
                return {
                    id: gid,
                    partner,
                    lastMessage: lastMsg
                        ? {
                            content: lastMsg.content,
                            type: lastMsg.message_type,
                            senderName: senderNames[lastMsg.sender_id] || 'Unknown',
                            time: lastMsg.created_at,
                        }
                        : null,
                    unreadCount: unreadCountByGroup[gid] || 0,
                };
            });

            list.sort((a, b) => {
                const timeA = a.lastMessage?.time ? new Date(a.lastMessage.time).getTime() : 0;
                const timeB = b.lastMessage?.time ? new Date(b.lastMessage.time).getTime() : 0;
                return timeB - timeA;
            });

            setConversations(list);
        } catch (e) {
            console.warn('DMsListInFeed loadDMs:', e);
            setConversations([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadDMs();
    }, [loadDMs]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadDMs();
    }, [loadDMs]);

    const onPress = useCallback(
        (item) => {
            try {
                haptics.light();
            } catch (_) {}
            onSelectGroup?.(item.id);
        },
        [onSelectGroup]
    );

    const formatListTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const DM_ACCENT = [SOUP_COLORS.pink, SOUP_COLORS.green, SOUP_COLORS.blue];

    const renderItem = ({ item, index }) => {
        const accent = DM_ACCENT[index % 3];
        return (
            <Pressable
                style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: `${accent}18` },
                    item.unreadCount > 0 && styles.rowUnread,
                    pressed && { opacity: 0.9 },
                ]}
                onPress={() => onPress(item)}
            >
                <View style={styles.avatarWrap}>
                    {item.partner?.avatar_url ? (
                        <Image source={getAvatarSource(item.partner.avatar_url)} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar, { backgroundColor: accent }]}>
                            <Text style={styles.placeholderText}>{(item.partner?.display_name || '?')[0].toUpperCase()}</Text>
                        </View>
                    )}
                    {item.unreadCount > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: SOUP_COLORS.pink }]}>
                            <Text style={styles.unreadText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.rowContent}>
                    <View style={styles.rowTop}>
                        <Text style={styles.rowName} numberOfLines={1}>
                            {item.partner?.display_name || 'Unknown'}
                        </Text>
                        {item.lastMessage?.time && (
                            <Text style={styles.rowTime}>{formatListTime(item.lastMessage.time)}</Text>
                        )}
                    </View>
                    {item.partner?.status_text ? (
                        <Text style={styles.rowTagline} numberOfLines={1}>
                            "{item.partner.status_text}"
                        </Text>
                    ) : null}
                    <Text style={styles.rowPreview} numberOfLines={1}>
                        {item.lastMessage
                            ? item.lastMessage.type === 'voice'
                                ? '🎤 voice'
                                : (item.lastMessage.content || '')
                            : 'no messages yet'}
                    </Text>
                </View>
            </Pressable>
        );
    };

    if (loading && conversations.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
            </View>
        );
    }

    if (conversations.length === 0) {
        return (
            <View style={styles.emptyWrap}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>no DMs yet. start a chat from a group or someone's profile</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={SOUP_COLORS.blue} />
            }
        />
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
        borderRadius: 14,
    },
    rowUnread: {
        borderLeftColor: SOUP_COLORS.blue,
        backgroundColor: SOUP_COLORS.cream,
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
    placeholderAvatar: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: SOUP_COLORS.pink,
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
    rowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 2,
    },
    rowName: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        flex: 1,
    },
    rowTime: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    rowTagline: {
        fontSize: 13,
        fontStyle: 'italic',
        color: SOUP_COLORS.blue,
        marginBottom: 2,
    },
    rowPreview: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
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
