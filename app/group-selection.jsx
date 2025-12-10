import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Text, Modal, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestLanguage, setRequestLanguage] = useState('');

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('app_groups')
                .select('*')
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
            // First, ensure the user exists in app_users table
            const { data: existingUser, error: userCheckError } = await supabase
                .from('app_users')
                .select('id')
                .eq('id', user.id)
                .single();

            if (userCheckError && userCheckError.code === 'PGRST116') {
                // User doesn't exist, create them
                const { error: createError } = await supabase
                    .from('app_users')
                    .insert({
                        id: user.id,
                        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
                        created_at: new Date().toISOString()
                    });

                if (createError) {
                    console.error('Error creating user:', createError);
                    throw new Error('Failed to create user profile');
                }
            }

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

            // Navigate to avatar onboarding
            router.push('/onboarding/avatar');
        } catch (error) {
            console.error('Error joining groups:', error);
            Alert.alert('Error', 'Failed to join groups. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestLanguage = async () => {
        if (!requestLanguage.trim()) {
            Alert.alert('Please enter a language', 'Let us know which language you\'d like to see!');
            return;
        }

        try {
            const { error } = await supabase
                .from('app_language_requests')
                .insert({
                    user_id: user.id,
                    language_name: requestLanguage.trim(),
                    status: 'pending'
                });

            if (error) throw error;

            Alert.alert('Request submitted! 🎉', 'We\'ll review your language request soon');
            setRequestLanguage('');
            setShowRequestModal(false);
        } catch (error) {
            console.error('Error submitting language request:', error);
            Alert.alert('Error', 'Failed to submit request. Please try again.');
        }
    };

    const renderGroup = ({ item, index }) => {
        const isSelected = selectedGroups.includes(item.id);

        return (
            <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
                <Pressable
                    style={[styles.groupCard, isSelected && styles.groupCardSelected]}
                    onPress={() => {
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
            </Animated.View>
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

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {/* Active Groups */}
                {groups.filter(g => g.is_active).length > 0 && (
                    <>
                        <Text style={styles.sectionHeader}>active groups 🔥</Text>
                        {groups.filter(g => g.is_active).map((group, index) => (
                            <Animated.View key={group.id} entering={FadeInDown.delay(index * 50).springify()}>
                                {renderGroup({ item: group, index })}
                            </Animated.View>
                        ))}
                    </>
                )}

                {/* Inactive Groups */}
                {groups.filter(g => !g.is_active).length > 0 && (
                    <>
                        <Text style={styles.sectionHeader}>more groups 🌙</Text>
                        {groups.filter(g => !g.is_active).map((group, index) => (
                            <Animated.View key={group.id} entering={FadeInDown.delay((groups.filter(g => g.is_active).length + index) * 50).springify()}>
                                {renderGroup({ item: group, index })}
                            </Animated.View>
                        ))}
                    </>
                )}
            </ScrollView>

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
                            continue ({selectedGroups.length})
                        </ThemedText>
                    )}
                </Pressable>

                <Pressable onPress={() => setShowRequestModal(true)} style={styles.requestButton}>
                    <ThemedText style={styles.requestText}>don't see your language? 🌍</ThemedText>
                </Pressable>
            </View>

            {/* Language Request Modal */}
            <Modal
                visible={showRequestModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowRequestModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowRequestModal(false)}
                >
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>request a language 🌍</Text>
                        <Text style={styles.modalSubtitle}>which language would you like to see?</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Swahili, Tamil, Tagalog..."
                            placeholderTextColor="#999"
                            value={requestLanguage}
                            onChangeText={setRequestLanguage}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <Pressable
                                onPress={() => setShowRequestModal(false)}
                                style={styles.modalCancelButton}
                            >
                                <Text style={styles.modalCancelText}>cancel</Text>
                            </Pressable>

                            <Pressable
                                onPress={handleRequestLanguage}
                                style={[styles.modalSubmitButton, !requestLanguage.trim() && styles.buttonDisabled]}
                                disabled={!requestLanguage.trim()}
                            >
                                <Text style={styles.modalSubmitText}>submit</Text>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
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
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.textLight,
        textTransform: 'lowercase',
        marginTop: 16,
        marginBottom: 12,
        paddingHorizontal: 4,
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
    requestButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    requestText: {
        fontSize: 16,
        color: Colors.secondary,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 48,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 15,
        color: Colors.textLight,
        marginBottom: 24,
        textAlign: 'center',
    },
    modalInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.secondary,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.text,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    modalSubmitButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: Colors.secondary,
    },
    modalSubmitText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
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
