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
    const [challengeText, setChallengeText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            let query = supabase
                .from('app_groups')
                .select('id, name, language, member_count');

            // If community manager, only show assigned groups
            if (user?.role === 'community_manager') {
                const { data: assignments } = await supabase
                    .from('app_community_managers')
                    .select('group_id')
                    .eq('user_id', user.id);

                const groupIds = assignments?.map(a => a.group_id) || [];
                query = query.in('id', groupIds);
            }

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
        if (!selectedGroup || !challengeText.trim()) {
            Alert.alert('Missing Info', 'Please select a group and enter a challenge');
            return;
        }

        setSending(true);
        try {
            // Insert challenge
            const { data: challenge, error } = await supabase
                .from('app_challenges')
                .insert({
                    group_id: selectedGroup,
                    prompt_text: challengeText.trim(),
                    created_by: user.id
                })
                .select()
                .single();

            if (error) throw error;

            Alert.alert('Success!', 'Challenge sent to the group', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error sending challenge:', error);
            Alert.alert('Error', 'Failed to send challenge');
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

                <View style={styles.section}>
                    <Text style={styles.label}>Challenge Prompt</Text>
                    <TextInput
                        style={styles.textArea}
                        value={challengeText}
                        onChangeText={setChallengeText}
                        placeholder="e.g., What's your favorite holiday tradition?"
                        placeholderTextColor={SOUP_COLORS.subtext}
                        multiline
                        maxLength={300}
                    />
                    <Text style={styles.charCount}>{challengeText.length}/300</Text>
                </View>

                <Pressable
                    style={[
                        styles.sendButton,
                        (!selectedGroup || !challengeText.trim() || sending) && styles.sendButtonDisabled
                    ]}
                    onPress={sendChallenge}
                    disabled={!selectedGroup || !challengeText.trim() || sending}
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
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
});
