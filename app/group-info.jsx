import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, LogOut, Users, Image as ImageIcon, Volume2, VolumeX } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
};

export default function GroupInfoScreen() {
    const { id: groupId } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [voiceMessages, setVoiceMessages] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        loadGroupInfo();
    }, [groupId]);

    const loadGroupInfo = async () => {
        try {
            // Load group details
            const { data: groupData } = await supabase
                .from('app_groups')
                .select('*')
                .eq('id', groupId)
                .single();

            if (groupData) setGroup(groupData);

            // Load members
            const { data: memberData } = await supabase
                .from('app_group_members')
                .select(`
                    user_id,
                    joined_at,
                    role,
                    notifications_enabled,
                    app_users (id, display_name, avatar_url, status_text)
                `)
                .eq('group_id', groupId)
                .order('joined_at', { ascending: true });

            if (memberData) {
                setMembers(memberData.map(m => ({
                    ...m.app_users,
                    role: m.role,
                    joinedAt: m.joined_at
                })));

                // Find current user's notification setting
                const myMembership = memberData.find(m => m.user_id === user?.id);
                if (myMembership) {
                    setNotificationsEnabled(myMembership.notifications_enabled !== false);
                }
            }

            // Load voice messages (media)
            const { data: voiceData } = await supabase
                .from('app_messages')
                .select('id, media_url, duration_seconds, created_at, sender:app_users!sender_id(display_name)')
                .eq('group_id', groupId)
                .eq('message_type', 'voice')
                .order('created_at', { ascending: false })
                .limit(20);

            if (voiceData) setVoiceMessages(voiceData);

        } catch (error) {
            console.error('Error loading group info:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveGroup = () => {
        Alert.alert(
            'Leave Group',
            `Are you sure you want to leave "${group?.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase
                                .from('app_group_members')
                                .delete()
                                .eq('group_id', groupId)
                                .eq('user_id', user.id);

                            // Decrement member count
                            await supabase.rpc('decrement_group_member_count', { group_id: groupId });

                            router.replace('/(tabs)');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to leave group');
                        }
                    }
                }
            ]
        );
    };

    const toggleNotifications = async () => {
        try {
            const newValue = !notificationsEnabled;
            await supabase
                .from('app_group_members')
                .update({ notifications_enabled: newValue })
                .eq('group_id', groupId)
                .eq('user_id', user.id);

            setNotificationsEnabled(newValue);
        } catch (error) {
            console.error('Error toggling notifications:', error);
        }
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
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={28} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Group Info</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Group Card */}
                <View style={styles.groupCard}>
                    <View style={styles.groupAvatar}>
                        <Text style={styles.groupAvatarText}>
                            {group?.name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </View>
                    <Text style={styles.groupName}>{group?.name}</Text>
                    <Text style={styles.groupMeta}>
                        {group?.language} • {members.length} members
                    </Text>
                    {group?.description && (
                        <Text style={styles.groupDescription}>{group.description}</Text>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    <Pressable style={styles.actionRow} onPress={toggleNotifications}>
                        {notificationsEnabled ? (
                            <Volume2 size={22} color={SOUP_COLORS.green} />
                        ) : (
                            <VolumeX size={22} color="#8E8E93" />
                        )}
                        <Text style={styles.actionText}>
                            {notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
                        </Text>
                    </Pressable>

                    <Pressable style={styles.actionRow} onPress={handleLeaveGroup}>
                        <LogOut size={22} color={SOUP_COLORS.pink} />
                        <Text style={[styles.actionText, { color: SOUP_COLORS.pink }]}>
                            Leave Group
                        </Text>
                    </Pressable>
                </View>

                {/* Members */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Users size={18} color="#8E8E93" />
                        <Text style={styles.sectionTitle}>{members.length} Members</Text>
                    </View>

                    {members.map(member => (
                        <View key={member.id} style={styles.memberRow}>
                            {member.avatar_url ? (
                                <Image source={{ uri: member.avatar_url }} style={styles.memberAvatar} />
                            ) : (
                                <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                                    <Text style={styles.memberAvatarText}>
                                        {member.display_name?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>
                                    {member.display_name}
                                    {member.id === user?.id && ' (You)'}
                                </Text>
                                {member.status_text && (
                                    <Text style={styles.memberStatus} numberOfLines={1}>
                                        {member.status_text}
                                    </Text>
                                )}
                            </View>
                            {member.role === 'admin' && (
                                <View style={styles.adminBadge}>
                                    <Text style={styles.adminBadgeText}>Admin</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* Voice Messages */}
                {voiceMessages.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <ImageIcon size={18} color="#8E8E93" />
                            <Text style={styles.sectionTitle}>Recent Voice Memos</Text>
                        </View>

                        {voiceMessages.slice(0, 5).map(msg => (
                            <View key={msg.id} style={styles.voiceRow}>
                                <Text style={styles.voiceSender}>{msg.sender?.display_name}</Text>
                                <Text style={styles.voiceDuration}>
                                    {msg.duration_seconds ? `${msg.duration_seconds}s` : 'Voice memo'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
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
        backgroundColor: SOUP_COLORS.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
    },
    content: {
        flex: 1,
    },
    groupCard: {
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    groupAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    groupAvatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
    },
    groupName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    groupMeta: {
        fontSize: 14,
        color: '#8E8E93',
    },
    groupDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 20,
    },
    section: {
        backgroundColor: '#fff',
        marginTop: 16,
        paddingHorizontal: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E8E93',
        textTransform: 'uppercase',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    actionText: {
        fontSize: 16,
        color: '#000',
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    memberAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    memberAvatarPlaceholder: {
        backgroundColor: SOUP_COLORS.green,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberAvatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    memberStatus: {
        fontSize: 13,
        color: '#8E8E93',
        marginTop: 2,
    },
    adminBadge: {
        backgroundColor: `${SOUP_COLORS.blue}20`,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    adminBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    voiceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    voiceSender: {
        fontSize: 14,
        color: '#000',
    },
    voiceDuration: {
        fontSize: 13,
        color: '#8E8E93',
    },
});
