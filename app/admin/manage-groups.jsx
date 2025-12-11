import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2, Users, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ff6b9d',
    cream: '#fffbf5',
    subtext: '#666',
    red: '#ff4444',
};

export default function ManageGroups() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        language: 'French',
        description: '',
    });

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const { data, error } = await supabase
                .from('app_groups')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setGroups(data || []);
        } catch (error) {
            console.error('Error loading groups:', error);
            Alert.alert('Error', 'Failed to load groups');
        } finally {
            setLoading(false);
        }
    };

    const toggleGroupVisibility = async (groupId, currentVisibility) => {
        try {
            const { error } = await supabase
                .from('app_groups')
                .update({ is_visible: !currentVisibility })
                .eq('id', groupId);

            if (error) throw error;

            // Optimistic update
            setGroups(groups.map(g =>
                g.id === groupId ? { ...g, is_visible: !currentVisibility } : g
            ));
        } catch (error) {
            console.error('Error updating visibility:', error);
            Alert.alert('Error', 'Failed to update visibility');
        }
    };

    const handleCreateGroup = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('app_groups')
                .insert({
                    name: formData.name,
                    language: formData.language,
                    description: formData.description,
                    member_count: 0
                })
                .select()
                .single();

            if (error) throw error;

            Alert.alert('Success', 'Group created successfully!');
            setFormData({ name: '', language: 'French', description: '' });
            setShowCreateForm(false);
            loadGroups();
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'Failed to create group');
        }
    };

    const handleDeleteGroup = async (groupId, groupName) => {
        Alert.alert(
            'Delete Group',
            `Are you sure you want to delete "${groupName}"? This will remove all members and messages.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('app_groups')
                                .delete()
                                .eq('id', groupId);

                            if (error) throw error;

                            Alert.alert('Success', 'Group deleted successfully');
                            loadGroups();
                        } catch (error) {
                            console.error('Error deleting group:', error);
                            Alert.alert('Error', 'Failed to delete group');
                        }
                    }
                }
            ]
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
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Manage Groups</Text>
                <Pressable onPress={() => setShowCreateForm(!showCreateForm)} style={styles.addButton}>
                    <Plus size={24} color={SOUP_COLORS.blue} />
                </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Create Form */}
                {showCreateForm && (
                    <View style={styles.createForm}>
                        <Text style={styles.formTitle}>Create New Group</Text>

                        <Text style={styles.label}>Group Name *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            placeholder="e.g., French Beginners"
                            placeholderTextColor="#999"
                        />

                        <Text style={styles.label}>Language *</Text>
                        <View style={styles.languageOptions}>
                            {['French', 'Spanish', 'German', 'Italian', 'Japanese', 'Korean'].map(lang => (
                                <Pressable
                                    key={lang}
                                    style={[
                                        styles.languageButton,
                                        formData.language === lang && styles.languageButtonActive
                                    ]}
                                    onPress={() => setFormData(prev => ({ ...prev, language: lang }))}
                                >
                                    <Text style={[
                                        styles.languageText,
                                        formData.language === lang && styles.languageTextActive
                                    ]}>{lang}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput
                            style={styles.textArea}
                            value={formData.description}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                            placeholder="Describe what this group is about..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                        />

                        <Pressable style={styles.createButton} onPress={handleCreateGroup}>
                            <Text style={styles.createButtonText}>Create Group</Text>
                        </Pressable>
                    </View>
                )}

                {/* Groups List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>All Groups ({groups.length})</Text>
                    {groups.map((group) => (
                        <View key={group.id} style={[styles.groupCard, !group.is_visible && styles.groupCardHidden]}>
                            <View style={styles.groupHeader}>
                                <View style={styles.groupInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.groupName}>{group.name}</Text>
                                        {!group.is_visible && (
                                            <View style={styles.hiddenBadge}>
                                                <Text style={styles.hiddenBadgeText}>HIDDEN</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.groupLanguage}>{group.language}</Text>
                                </View>
                                <View style={styles.actions}>
                                    <Pressable
                                        style={styles.actionButton}
                                        onPress={() => toggleGroupVisibility(group.id, group.is_visible)}
                                    >
                                        {group.is_visible ? (
                                            <Eye size={20} color={SOUP_COLORS.blue} />
                                        ) : (
                                            <EyeOff size={20} color={SOUP_COLORS.subtext} />
                                        )}
                                    </Pressable>
                                    <Pressable
                                        style={styles.actionButton}
                                        onPress={() => handleDeleteGroup(group.id, group.name)}
                                    >
                                        <Trash2 size={20} color={SOUP_COLORS.red} />
                                    </Pressable>
                                </View>
                            </View>
                            {group.description && (
                                <Text style={styles.groupDescription}>{group.description}</Text>
                            )}
                            <View style={styles.groupStats}>
                                <View style={styles.statItem}>
                                    <Users size={16} color={SOUP_COLORS.subtext} />
                                    <Text style={styles.statText}>{group.member_count} members</Text>
                                </View>
                            </View>
                        </View>
                    ))}
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
    addButton: {
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
    createForm: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    formTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
        marginTop: 12,
    },
    textInput: {
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    textArea: {
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#000',
        minHeight: 80,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    languageOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    languageButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: SOUP_COLORS.cream,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    languageButtonActive: {
        backgroundColor: SOUP_COLORS.blue,
        borderColor: SOUP_COLORS.blue,
    },
    languageText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#000',
    },
    languageTextActive: {
        color: '#fff',
    },
    createButton: {
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    groupLanguage: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    groupDescription: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
        lineHeight: 20,
    },
    groupStats: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    deleteButton: {
        padding: 4,
    },
    groupCardHidden: {
        opacity: 0.7,
        backgroundColor: '#f5f5f5',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    hiddenBadge: {
        backgroundColor: '#eee',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    hiddenBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
    },
});
