import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Text, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function GroupSelectionScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('app_groups')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;

            setGroups(data || []);
        } catch (error) {
            console.error('Error loading groups:', error);
            Alert.alert('Error', 'Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = (groupId) => {
        if (selectedGroups.includes(groupId)) {
            setSelectedGroups(prev => prev.filter(id => id !== groupId));
        } else {
            setSelectedGroups(prev => [...prev, groupId]);
        }
    };

    const handleContinue = async () => {
        if (selectedGroups.length === 0) {
            Alert.alert('Select Groups', 'Please select at least one language group to continue');
            return;
        }

        setSubmitting(true);

        try {
            // Join selected groups
            const memberships = selectedGroups.map(groupId => ({
                user_id: user.id,
                group_id: groupId,
                role: 'member',
            }));

            const { error } = await supabase
                .from('app_group_members')
                .upsert(memberships, {
                    onConflict: 'user_id,group_id'
                });

            if (error) throw error;

            // Navigate to home
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error joining groups:', error);
            Alert.alert('Error', 'Failed to join groups. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = () => {
        router.replace('/(tabs)');
    };

    const renderGroup = ({ item }) => {
        const isSelected = selectedGroups.includes(item.id);

        return (
            <Pressable
                style={[styles.groupCard, isSelected && styles.groupCardSelected]}
                onPress={() => {
                    Vibration.vibrate(30);
                    toggleGroup(item.id);
                }}
            >
                <View style={styles.groupInfo}>
                    <ThemedText style={styles.groupName}>{item.name}</ThemedText>
                    <View style={styles.groupMeta}>
                        <ThemedText style={styles.metaText}>
                            {item.language} • {item.level || 'All Levels'}
                        </ThemedText>
                        <ThemedText style={styles.metaText}>
                            {item.member_count || 0} members
                        </ThemedText>
                    </View>
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Check size={20} color="#fff" />}
                </View>
            </Pressable>
        );
    };

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
                <ThemedText style={styles.title}>what u cooking up? 🍳</ThemedText>
                <ThemedText style={styles.subtitle}>pick your languages</ThemedText>
            </View>

            <FlatList
                data={groups}
                renderItem={renderGroup}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <ThemedText style={styles.emptyText}>
                            No groups available at the moment
                        </ThemedText>
                    </View>
                }
            />

            <View style={styles.footer}>
                <Pressable
                    onPress={handleContinue}
                    style={[styles.button, selectedGroups.length === 0 && styles.buttonDisabled]}
                    disabled={submitting || selectedGroups.length === 0}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.buttonText}>
                            Continue ({selectedGroups.length})
                        </ThemedText>
                    )}
                </Pressable>

                <Pressable onPress={handleSkip} style={styles.skipButton}>
                    <ThemedText style={styles.skipText}>Skip for now</ThemedText>
                </Pressable>
            </View>
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
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
    },
    list: {
        padding: 16,
        paddingTop: 0,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    groupCardSelected: {
        borderColor: Colors.secondary, // pink
        borderWidth: 3,
        backgroundColor: 'rgba(236, 0, 139, 0.05)', // light pink tint
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 6,
    },
    groupMeta: {
        gap: 4,
    },
    metaText: {
        fontSize: 14,
        color: Colors.textLight,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
    },
    checkboxSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    skipText: {
        color: Colors.primary,
        fontSize: 16,
    },
});
