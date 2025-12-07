import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Plus, LogOut } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#fffbf5',
    subtext: '#666',
};

export default function BrowseGroups() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [myGroupIds, setMyGroupIds] = useState([]);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            // Get groups user is already in
            const { data: memberData } = await supabase
                .from('app_group_members')
                .select('group_id')
                .eq('user_id', user.id);

            const joinedIds = memberData?.map(m => m.group_id) || [];
            setMyGroupIds(joinedIds);

            // Get all groups
            const { data, error } = await supabase
                .from('app_groups')
                .select('*')
                .order('member_count', { ascending: false });

            if (error) throw error;
            setGroups(data || []);
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const joinGroup = async (groupId) => {
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

            // Update group member count
            await supabase.rpc('increment_group_member_count', { group_id: groupId });

            // Refresh groups
            await loadGroups();
        } catch (error) {
            console.error('Error joining group:', error);
        }
    };

    const leaveGroup = async (groupId) => {
        try {
            const { error } = await supabase
                .from('app_group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', user.id);

            if (error) throw error;

            // Update local state
            setMyGroupIds(myGroupIds.filter(id => id !== groupId));

            // Decrement group member count
            await supabase.rpc('decrement_group_member_count', { group_id: groupId });

            // Refresh groups
            await loadGroups();
        } catch (error) {
            console.error('Error leaving group:', error);
        }
    };

    const renderGroup = ({ item }) => {
        const isMember = myGroupIds.includes(item.id);

        return (
            <View style={styles.groupCard}>
                <View style={styles.groupHeader}>
                    <Text style={styles.groupName}>{item.name}</Text>
                    <Text style={styles.groupLanguage}>{item.language}</Text>
                </View>

                {item.description && (
                    <Text style={styles.groupDescription}>{item.description}</Text>
                )}

                <View style={styles.groupFooter}>
                    <View style={styles.memberInfo}>
                        <Users size={14} color={SOUP_COLORS.subtext} />
                        <Text style={styles.memberCount}>{item.member_count} members</Text>
                    </View>

                    {isMember ? (
                        <View style={styles.memberActions}>
                            <Pressable
                                style={[styles.button, styles.viewButton]}
                                onPress={() => router.push(`/chat/${item.id}`)}
                            >
                                <Text style={styles.viewButtonText}>View</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.button, styles.leaveButton]}
                                onPress={() => leaveGroup(item.id)}
                            >
                                <LogOut size={14} color={SOUP_COLORS.pink} />
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable
                            style={[styles.button, styles.joinButton]}
                            onPress={() => joinGroup(item.id)}
                        >
                            <Plus size={16} color="#fff" />
                            <Text style={styles.joinButtonText}>Join</Text>
                        </Pressable>
                    )}
                </View>
            </View>
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
                <Text style={styles.headerTitle}>Browse Groups</Text>
                <Text style={styles.headerSubtitle}>Find your perfect language community</Text>
            </View>

            <FlatList
                data={groups}
                renderItem={renderGroup}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No groups available yet</Text>
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
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#000',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
    },
    list: {
        padding: 16,
    },
    groupCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    groupName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
        flex: 1,
    },
    groupLanguage: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        backgroundColor: `${SOUP_COLORS.blue}15`,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    groupDescription: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        lineHeight: 20,
        marginBottom: 12,
    },
    groupFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    memberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    memberCount: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    joinButton: {
        backgroundColor: SOUP_COLORS.blue,
    },
    joinButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    viewButton: {
        backgroundColor: SOUP_COLORS.cream,
        borderWidth: 1.5,
        borderColor: SOUP_COLORS.blue,
    },
    viewButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    memberActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    leaveButton: {
        backgroundColor: `${SOUP_COLORS.pink}15`,
        borderWidth: 1.5,
        borderColor: SOUP_COLORS.pink,
        paddingHorizontal: 10,
    },
    empty: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
    },
});
