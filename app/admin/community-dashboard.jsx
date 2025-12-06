import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Award } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ff6b9d',
    yellow: '#ffd93d',
    green: '#6bcf7f',
    cream: '#fffbf5',
};

export default function CommunityManagerDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [assignedGroups, setAssignedGroups] = useState([]);

    useEffect(() => {
        loadAssignedGroups();
    }, []);

    const loadAssignedGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('app_community_managers')
                .select(`
                    group_id,
                    app_groups (
                        id,
                        name,
                        member_count,
                        language
                    )
                `)
                .eq('user_id', user.id);

            if (error) throw error;
            setAssignedGroups(data?.map(d => d.app_groups) || []);
        } catch (error) {
            console.error('Error loading assigned groups:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.green} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Community Manager</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.welcomeCard}>
                    <Award size={32} color={SOUP_COLORS.green} />
                    <Text style={styles.welcomeTitle}>Welcome, {user?.display_name}!</Text>
                    <Text style={styles.welcomeText}>Managing {assignedGroups.length} group(s)</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Groups</Text>
                    {assignedGroups.map(group => (
                        <Pressable
                            key={group.id}
                            style={styles.groupCard}
                            onPress={() => router.push(`/admin/send-challenge?groupId=${group.id}&groupName=${group.name}`)}
                        >
                            <View style={styles.groupInfo}>
                                <Text style={styles.groupName}>{group.name}</Text>
                                <Text style={styles.groupMeta}>
                                    {group.member_count} members • {group.language}
                                </Text>
                            </View>
                            <View style={styles.actionButton}>
                                <Calendar size={20} color={SOUP_COLORS.green} />
                                <Text style={styles.actionText}>Send Challenge</Text>
                            </View>
                        </Pressable>
                    ))}

                    {assignedGroups.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No groups assigned yet</Text>
                        </View>
                    )}
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
    },
    welcomeCard: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginTop: 12,
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
        color: '#000',
    },
    groupCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    groupMeta: {
        fontSize: 13,
        color: '#666',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: `${SOUP_COLORS.green}20`,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.green,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
    },
});
