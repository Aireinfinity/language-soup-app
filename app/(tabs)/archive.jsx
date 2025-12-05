import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Text, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, MessageCircle } from 'lucide-react-native';

export default function ArchiveScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadChallenges();
        }
    }, [user]);

    const loadChallenges = async () => {
        try {
            // Get user's groups
            const { data: memberships } = await supabase
                .from('app_group_members')
                .select('group_id')
                .eq('user_id', user.id);

            if (!memberships || memberships.length === 0) {
                setLoading(false);
                return;
            }

            const groupIds = memberships.map(m => m.group_id);

            // Get challenges from user's groups
            const { data: challengesData, error } = await supabase
                .from('app_challenges')
                .select(`
                    *,
                    app_groups (
                        name,
                        language
                    )
                `)
                .in('group_id', groupIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get message counts for each challenge
            const challengesWithCounts = await Promise.all(
                (challengesData || []).map(async (challenge) => {
                    const { count } = await supabase
                        .from('app_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('challenge_id', challenge.id);

                    return {
                        ...challenge,
                        messageCount: count || 0
                    };
                })
            );

            setChallenges(challengesWithCounts);
        } catch (error) {
            console.error('Error loading challenges:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const renderChallenge = ({ item }) => (
        <Pressable
            style={styles.challengeCard}
            onPress={() => router.push(`/chat/${item.group_id}`)}
        >
            <View style={styles.challengeHeader}>
                <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>
                        {item.app_groups?.language?.charAt(0).toUpperCase() || 'L'}
                    </Text>
                </View>
                <View style={styles.challengeInfo}>
                    <ThemedText style={styles.groupName}>{item.app_groups?.name || 'Group'}</ThemedText>
                    <View style={styles.metaRow}>
                        <Calendar size={14} color={Colors.textLight} />
                        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                    </View>
                </View>
            </View>

            <ThemedText style={styles.challengeText} numberOfLines={2}>
                {item.prompt_text}
            </ThemedText>

            <View style={styles.footer}>
                <View style={styles.messageCount}>
                    <MessageCircle size={16} color={Colors.primary} />
                    <Text style={styles.countText}>{item.messageCount} responses</Text>
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
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <ThemedText style={styles.title}>leftovers 🥣</ThemedText>
                <ThemedText style={styles.subtitle}>past challenges u participated in</ThemedText>
            </View>

            <FlatList
                data={challenges}
                renderItem={renderChallenge}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Calendar size={48} color={Colors.textLight} />
                        <ThemedText style={styles.emptyText}>no past challenges yet</ThemedText>
                        <ThemedText style={styles.emptySubtext}>check back after ur first challenge!</ThemedText>
                    </View>
                }
            />
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
        padding: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textLight,
    },
    list: {
        padding: 16,
    },
    challengeCard: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    groupBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    groupBadgeText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    challengeInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    date: {
        fontSize: 12,
        color: Colors.textLight,
    },
    challengeText: {
        fontSize: 14,
        color: Colors.text,
        marginBottom: 12,
        lineHeight: 20,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    messageCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    countText: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '600',
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textLight,
        marginTop: 8,
    },
});
