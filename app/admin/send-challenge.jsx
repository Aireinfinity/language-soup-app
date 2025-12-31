import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Calendar } from 'lucide-react-native';
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

export default function SendChallengeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { groupId, groupName } = useLocalSearchParams();

    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(groupId || null);
    const [englishVersion, setEnglishVersion] = useState('');
    const [nativeVersion, setNativeVersion] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [broadcastToAll, setBroadcastToAll] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            // Check if user is admin or community manager from app_users table
            const { data: userProfile } = await supabase
                .from('app_users')
                .select('is_admin, is_community_manager')
                .eq('id', user.id)
                .single();

            let query = supabase
                .from('app_groups')
                .select('id, name, language, member_count');

            // If community manager (but NOT admin), only show assigned groups
            if (userProfile?.is_community_manager && !userProfile?.is_admin) {
                const { data: assignments } = await supabase
                    .from('app_community_managers')
                    .select('group_id')
                    .eq('user_id', user.id);

                const groupIds = assignments?.map(a => a.group_id) || [];

                // Only apply filter if there are assigned groups
                if (groupIds.length > 0) {
                    query = query.in('id', groupIds);
                } else {
                    // Community manager with no assignments - show no groups
                    setGroups([]);
                    setLoading(false);
                    return;
                }
            }
            // If admin, show all groups (no filter applied)

            const { data, error } = await query.order('name');

            if (error) throw error;
            setGroups(data || []);
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendChallenge = async () => {
        if (!englishVersion.trim() || !nativeVersion.trim()) {
            Alert.alert('Missing Info', 'Please enter both English and native language versions');
            return;
        }

        // Determine target groups
        const targetGroups = broadcastToAll ? groups : groups.filter(g => g.id === selectedGroup);

        if (targetGroups.length === 0) {
            Alert.alert('No Groups', 'Please select a group or enable broadcast mode');
            return;
        }

        // Confirmation for broadcast
        if (broadcastToAll) {
            Alert.alert(
                '🎄 Holiday Broadcast',
                `Send this challenge to ALL ${targetGroups.length} groups?\n\nThis will notify everyone in every group!`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: `Send to ${targetGroups.length} Groups`,
                        style: 'destructive',
                        onPress: () => executeSend(targetGroups)
                    }
                ]
            );
        } else {
            if (!selectedGroup) {
                Alert.alert('No Group Selected', 'Please select a group');
                return;
            }
            executeSend(targetGroups);
        }
    };

    const executeSend = async (targetGroups) => {
        setSending(true);
        let successCount = 0;
        let failCount = 0;

        try {
            const combinedPrompt = `${englishVersion.trim()}\n${nativeVersion.trim()}`;

            // Send to each target group
            for (const group of targetGroups) {
                try {
                    // Insert challenge
                    const { data: challenge, error } = await supabase
                        .from('app_challenges')
                        .insert({
                            group_id: group.id,
                            prompt_text: combinedPrompt,
                            created_by: user.id
                        })
                        .select()
                        .single();

                    if (error) throw error;

                    // Send push notifications for this group
                    const { data: members } = await supabase
                        .from('app_group_members')
                        .select('user_id')
                        .eq('group_id', group.id);

                    if (members?.length > 0) {
                        const userIds = members.map(m => m.user_id).filter(id => id !== user.id);

                        if (userIds.length > 0) {
                            const { data: tokens } = await supabase
                                .from('app_push_tokens')
                                .select('expo_push_token')
                                .in('user_id', userIds);

                            if (tokens?.length > 0) {
                                const groupLanguage = group.language?.toLowerCase();

                                // Fetch language-specific notification
                                let languageNotification = null;
                                if (groupLanguage) {
                                    const { data: langData } = await supabase
                                        .from('app_language_notifications')
                                        .select('country_flag, notification_message')
                                        .eq('language', groupLanguage)
                                        .single();

                                    if (langData) {
                                        languageNotification = `${langData.country_flag} ${langData.notification_message}`;
                                    }
                                }

                                const randomEmojis = ['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'];
                                const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

                                const notificationOptions = [
                                    `${randomEmoji} new challenge in ${group.name}`,
                                    `${randomEmoji} bro ur late the challenge is here! ${group.name}`,
                                    `${randomEmoji} wait wait wait... new challenge? hell yeah! ${group.name}`,
                                    languageNotification
                                        ? `${languageNotification} (${group.name})`
                                        : `${randomEmoji} new challenge in ${group.name}`
                                ];

                                const pushMessages = tokens.map(t => {
                                    const randomBody = notificationOptions[Math.floor(Math.random() * notificationOptions.length)];
                                    return {
                                        to: t.expo_push_token,
                                        sound: 'default',
                                        title: 'mmm goood soup!',
                                        body: randomBody,
                                        data: {
                                            type: 'challenge',
                                            groupId: group.id,
                                            challengeId: challenge.id
                                        },
                                    };
                                });

                                console.log(`📤 Sending ${pushMessages.length} notifications for group ${group.name}`);

                                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                                    method: 'POST',
                                    headers: {
                                        'Accept': 'application/json',
                                        'Accept-encoding': 'gzip, deflate',
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(pushMessages),
                                });

                                const result = await response.json();
                                console.log('📬 Notification response:', result);
                            } else {
                                console.log(`⚠️ No push tokens found for ${userIds.length} users`);
                            }
                        } else {
                            console.log(`⚠️ No other users in group ${group.name} (only sender)`);
                        }
                    } else {
                        console.log(`⚠️ No members found in group ${group.name}`);
                    }

                    successCount++;
                } catch (groupError) {
                    console.error(`Error sending to ${group.name}:`, groupError);
                    failCount++;
                }
            }

            // Show results
            if (broadcastToAll) {
                Alert.alert(
                    '🎄 Broadcast Complete!',
                    `Successfully sent to ${successCount} group(s)${failCount > 0 ? `\n${failCount} failed` : ''}`,
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            } else {
                Alert.alert('Success!', 'Challenge sent to the group', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error) {
            console.error('Error sending challenge:', error);
            Alert.alert('Error', `Failed to send challenge: ${error.message || 'Unknown error'}`);
        } finally {
            setSending(false);
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
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Send Challenge</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Broadcast Toggle */}
                <Pressable
                    style={[styles.broadcastCard, broadcastToAll && styles.broadcastCardActive]}
                    onPress={() => setBroadcastToAll(!broadcastToAll)}
                >
                    <View style={styles.broadcastHeader}>
                        <Text style={styles.broadcastEmoji}>🎄</Text>
                        <View style={styles.broadcastTextContainer}>
                            <Text style={styles.broadcastTitle}>Holiday Broadcast Mode</Text>
                            <Text style={styles.broadcastSubtitle}>
                                {broadcastToAll
                                    ? `Sending to ALL ${groups.length} groups`
                                    : 'Tap to send to all groups'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.broadcastToggle, broadcastToAll && styles.broadcastToggleActive]}>
                        <View style={[styles.broadcastToggleKnob, broadcastToAll && styles.broadcastToggleKnobActive]} />
                    </View>
                </Pressable>

                {!broadcastToAll && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Select Group</Text>
                        {groups.map(group => (
                            <Pressable
                                key={group.id}
                                style={[
                                    styles.groupOption,
                                    selectedGroup === group.id && styles.groupOptionSelected
                                ]}
                                onPress={() => setSelectedGroup(group.id)}
                            >
                                <View style={styles.radioOuter}>
                                    {selectedGroup === group.id && <View style={styles.radioInner} />}
                                </View>
                                <View style={styles.groupInfo}>
                                    <Text style={styles.groupName}>{group.name}</Text>
                                    <Text style={styles.groupMeta}>
                                        {group.member_count} members • {group.language}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}

                        {groups.length === 0 && (
                            <Text style={styles.noGroups}>No groups available</Text>
                        )}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.label}>English Version</Text>
                    <TextInput
                        style={styles.textArea}
                        value={englishVersion}
                        onChangeText={setEnglishVersion}
                        placeholder="What's your favorite holiday tradition?"
                        placeholderTextColor={SOUP_COLORS.subtext}
                        multiline
                        maxLength={150}
                    />
                    <Text style={styles.charCount}>{englishVersion.length}/150</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Native Language Version</Text>
                    <TextInput
                        style={styles.textArea}
                        value={nativeVersion}
                        onChangeText={setNativeVersion}
                        placeholder="¿Cuál es tu tradición navideña favorita?"
                        placeholderTextColor={SOUP_COLORS.subtext}
                        multiline
                        maxLength={150}
                    />
                    <Text style={styles.charCount}>{nativeVersion.length}/150</Text>
                </View>

                <Pressable
                    style={[
                        styles.sendButton,
                        ((!selectedGroup && !broadcastToAll) || !englishVersion.trim() || !nativeVersion.trim() || sending) && styles.sendButtonDisabled
                    ]}
                    onPress={sendChallenge}
                    disabled={(!selectedGroup && !broadcastToAll) || !englishVersion.trim() || !nativeVersion.trim() || sending}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Send size={20} color="#fff" />
                            <Text style={styles.sendButtonText}>Send Challenge Now</Text>
                        </>
                    )}
                </Pressable>

                <View style={styles.infoBox}>
                    <Calendar size={16} color={SOUP_COLORS.blue} />
                    <Text style={styles.infoText}>
                        Challenge will be sent immediately and pinned in the group chat
                    </Text>
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
        backgroundColor: '#fff',
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
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    formatHint: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    groupOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    groupOptionSelected: {
        borderColor: SOUP_COLORS.blue,
        backgroundColor: `${SOUP_COLORS.blue}10`,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: SOUP_COLORS.blue,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    groupMeta: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    noGroups: {
        textAlign: 'center',
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
        padding: 24,
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    charCount: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        textAlign: 'right',
        marginTop: 8,
    },
    sendButton: {
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${SOUP_COLORS.blue}15`,
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: SOUP_COLORS.blue,
        lineHeight: 18,
    },
    broadcastCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    broadcastCardActive: {
        borderColor: SOUP_COLORS.green,
        backgroundColor: `${SOUP_COLORS.green}10`,
    },
    broadcastHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    broadcastEmoji: {
        fontSize: 32,
    },
    broadcastTextContainer: {
        flex: 1,
    },
    broadcastTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    broadcastSubtitle: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    broadcastToggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E0E0E0',
        padding: 2,
        justifyContent: 'center',
    },
    broadcastToggleActive: {
        backgroundColor: SOUP_COLORS.green,
    },
    broadcastToggleKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    broadcastToggleKnobActive: {
        transform: [{ translateX: 22 }],
    },
});
