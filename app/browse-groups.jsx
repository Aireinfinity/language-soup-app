import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, LogOut } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useQuests } from '../contexts/QuestContext';
import { pickRandom, JOINING_LABELS } from '../constants/CopyPhilosophy';
import { getAvatarSource, sortAvatarUrlsRealFirst } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    turquoise: '#00ADEF',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

function displayGroupName(name) {
    if (!name || typeof name !== 'string') return name || '';
    return name.replace(/\s*\(click here!\)\s*/gi, '').trim() || name;
}

export default function BrowseGroups() {
    const { user } = useAuth();
    const router = useRouter();
    const { completeQuest } = useQuests();
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [myGroupIds, setMyGroupIds] = useState([]);
    const [actionLoading, setActionLoading] = useState({}); // Track loading state per group
    const [joinLoadingLabel, setJoinLoadingLabel] = useState('joining…');
    const [search, setSearch] = useState('');
    const [memberAvatarsByGroupId, setMemberAvatarsByGroupId] = useState({});

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const { data: memberData } = await supabase
                .from('app_group_members')
                .select('group_id')
                .eq('user_id', user.id);

            const joinedIds = memberData?.map(m => m.group_id) || [];
            setMyGroupIds(joinedIds);

            const { data, error } = await supabase
                .from('app_groups')
                .select('*')
                .eq('is_visible', true)
                .order('member_count', { ascending: false });

            if (error) throw error;
            const groupList = data || [];
            setGroups(groupList);

            if (groupList.length > 0) {
                const ids = groupList.map((g) => g.id);
                const { data: members } = await supabase
                    .from('app_group_members')
                    .select('group_id, user_id')
                    .in('group_id', ids);
                const userIds = [...new Set((members || []).map((m) => m.user_id))];
                if (userIds.length > 0) {
                    const { data: users } = await supabase
                        .from('app_users')
                        .select('id, avatar_url')
                        .in('id', userIds);
                    const urlById = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.avatar_url }), {});
                    const byGroup = {};
                    (members || []).forEach((m) => {
                        if (!byGroup[m.group_id]) byGroup[m.group_id] = [];
                        const url = urlById[m.user_id];
                        if (url && byGroup[m.group_id].length < 5) byGroup[m.group_id].push(url);
                    });
                    Object.keys(byGroup).forEach((gid) => {
                        byGroup[gid] = sortAvatarUrlsRealFirst(byGroup[gid]).slice(0, 5);
                    });
                    setMemberAvatarsByGroupId(byGroup);
                }
            }
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const joinGroup = async (groupId) => {
        setJoinLoadingLabel(pickRandom(JOINING_LABELS));
        setActionLoading(prev => ({ ...prev, [groupId]: true }));
        try {
            const { error } = await supabase
                .from('app_group_members')
                .insert({
                    group_id: groupId,
                    user_id: user.id
                });

            if (error) throw error;

            // Update local state
            setMyGroupIds([...myGroupIds, groupId]);

            // Complete quest!
            await completeQuest('join_group');

            // Refresh groups (trigger will update member_count automatically)
            await loadGroups();
        } catch (error) {
            console.error('Error joining group:', error);
            Alert.alert(
                'Could Not Join Group',
                'Something went wrong. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [groupId]: false }));
        }
    };

    const leaveGroup = async (groupId) => {
        setActionLoading(prev => ({ ...prev, [groupId]: true }));
        try {
            const { error } = await supabase
                .from('app_group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Update local state
            setMyGroupIds(myGroupIds.filter(id => id !== groupId));

            // Refresh groups (trigger will update member_count automatically)
            await loadGroups();
        } catch (error) {
            console.error('Error leaving group:', error);
            Alert.alert(
                'Could Not Leave Group',
                'Something went wrong. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setActionLoading(prev => ({ ...prev, [groupId]: false }));
        }
    };

    const filteredGroups = search.trim()
        ? groups.filter(
            (g) =>
                (g.name || '').toLowerCase().includes(search.trim().toLowerCase()) ||
                (g.language || '').toLowerCase().includes(search.trim().toLowerCase())
        )
        : groups;

    const renderGroup = ({ item }) => {
        const isMember = myGroupIds.includes(item.id);
        const isLoading = actionLoading[item.id];
        const displayName = displayGroupName(item.name);
        const count = item.member_count || 0;
        const avatarUrls = memberAvatarsByGroupId[item.id] || [];

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.row,
                    pressed && { opacity: 0.9 },
                    isMember && styles.rowMine,
                ]}
                onPress={() => !isMember && !isLoading && joinGroup(item.id)}
                disabled={isMember || isLoading}
            >
                <View style={styles.rowLeft}>
                    {avatarUrls.length > 0 && (
                        <View style={styles.avatarRow}>
                            {avatarUrls.slice(0, 5).map((url, i) => {
                                const source = getAvatarSource(url);
                                return source ? (
                                    <Image key={i} source={source} style={styles.avatarDot} />
                                ) : (
                                    <View key={i} style={[styles.avatarDot, styles.avatarDotPlaceholder]}>
                                        <Text style={styles.avatarDotLetter}>?</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                    <Text style={[styles.rowText, isMember && styles.rowTextMine]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={styles.rowCount}>
                        {count} {count === 1 ? 'person' : 'people'}
                        {item.language ? ` · ${item.language}` : ''}
                    </Text>
                </View>
                {isMember ? (
                    <View style={styles.rowActions}>
                        <Pressable
                            style={({ pressed: p }) => [styles.peekBtn, p && { opacity: 0.9 }]}
                            onPress={() => router.push(`/chat/${item.id}`)}
                        >
                            <Text style={styles.peekBtnText}>peek</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed: p }) => [styles.leaveBtn, p && { opacity: 0.9 }]}
                            onPress={() => leaveGroup(item.id)}
                        >
                            <LogOut size={14} color={SOUP_COLORS.pink} />
                        </Pressable>
                    </View>
                ) : isLoading ? (
                    <View style={styles.rowRight}>
                        <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} />
                        <Text style={styles.rowAdd}>{joinLoadingLabel}</Text>
                    </View>
                ) : (
                    <Text style={styles.rowAdd}>+ join</Text>
                )}
            </Pressable>
        );
    };

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
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}>
                    <ArrowLeft size={24} color={SOUP_COLORS.text} />
                </Pressable>
                <Text style={styles.title}>join groups</Text>
            </View>
            <Text style={styles.subtitle}>pick a group to join. we'll add you and you'll see it in your feed.</Text>
            <TextInput
                style={styles.search}
                placeholder="search groups…"
                placeholderTextColor={SOUP_COLORS.subtext}
                value={search}
                onChangeText={setSearch}
            />
            <FlatList
                data={filteredGroups}
                renderItem={renderGroup}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>no groups yet</Text>
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
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 12,
    },
    backBtn: { padding: 8 },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    subtitle: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    search: {
        height: 44,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 14,
        backgroundColor: '#fff',
        borderRadius: 12,
        fontSize: 16,
        color: SOUP_COLORS.text,
    },
    list: { flex: 1 },
    listContent: { paddingBottom: 24 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    rowMine: { backgroundColor: 'rgba(0,173,239,0.06)' },
    rowLeft: { flex: 1, minWidth: 0 },
    avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    avatarDot: { width: 24, height: 24, borderRadius: 12, marginRight: -6, borderWidth: 2, borderColor: SOUP_COLORS.cream },
    avatarDotPlaceholder: { backgroundColor: SOUP_COLORS.turquoise, justifyContent: 'center', alignItems: 'center' },
    avatarDotLetter: { fontSize: 10, fontWeight: '800', color: '#fff' },
    rowText: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    rowTextMine: { color: SOUP_COLORS.subtext },
    rowCount: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    rowAdd: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.turquoise,
    },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    peekBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(0,173,239,0.15)',
    },
    peekBtnText: { fontSize: 13, fontWeight: '700', color: SOUP_COLORS.turquoise },
    leaveBtn: { padding: 8 },
    empty: { alignItems: 'center', paddingVertical: 48 },
    emptyText: { fontSize: 15, color: SOUP_COLORS.subtext },
});
