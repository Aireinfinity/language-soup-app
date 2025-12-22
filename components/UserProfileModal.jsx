import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Crown } from 'lucide-react-native';
import { getLanguageFlag } from '../utils/languageFlags';
import { GroupSelectorModal } from './GroupSelectorModal';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * UserProfileModal - Spotify-style full-screen profile view
 * Shows user's avatar, name, tagline, languages, and stats
 * Admins can promote users to Community Manager
 */
export function UserProfileModal({ visible, userId, currentUserId, isAdmin, onClose }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [backgroundColor, setBackgroundColor] = useState(SOUP_COLORS.cream);
    const [isCommunityManager, setIsCommunityManager] = useState(false);
    const [managedGroups, setManagedGroups] = useState([]);
    const [showGroupSelector, setShowGroupSelector] = useState(false);
    const [availableGroups, setAvailableGroups] = useState([]);

    useEffect(() => {
        if (visible && userId) {
            loadUserProfile();
        }
    }, [visible, userId]);

    const loadUserProfile = async () => {
        try {
            const { supabase } = require('../lib/supabase');

            // Load user data
            const { data: userData } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userData) {
                setUser(userData);
                setBackgroundColor(SOUP_COLORS.cream);
            }

            // Check if user is a community manager
            const { data: cmData } = await supabase
                .from('app_community_manager_permissions')
                .select('group_id')
                .eq('user_id', userId);

            if (cmData && cmData.length > 0) {
                setIsCommunityManager(true);
                setManagedGroups(cmData.map(cm => cm.group_id));
            }

            // Load available groups for admin
            if (isAdmin) {
                const { data: groupsData } = await supabase
                    .from('app_groups')
                    .select('id, language')
                    .order('language');

                if (groupsData) {
                    setAvailableGroups(groupsData);
                }
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePromoteToCM = async () => {
        try {
            const { supabase } = require('../lib/supabase');

            // Delete existing permissions first
            await supabase
                .from('app_community_manager_permissions')
                .delete()
                .eq('user_id', userId);

            // Insert new permissions
            if (managedGroups.length > 0) {
                const permissions = managedGroups.map(groupId => ({
                    user_id: userId,
                    group_id: groupId
                }));

                const { error } = await supabase
                    .from('app_community_manager_permissions')
                    .insert(permissions);

                if (error) throw error;
            }

            Alert.alert('Success', 'Community manager permissions updated!');
            setShowGroupSelector(false);
            loadUserProfile();
        } catch (error) {
            console.error('Error updating CM permissions:', error);
            Alert.alert('Error', 'Could not update permissions');
        }
    };

    if (!visible || !user) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor }]}>
                <Pressable style={styles.backButton} onPress={onClose}>
                    <X size={28} color="#000" />
                </Pressable>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Avatar */}
                    {user.avatar_url ? (
                        <Image
                            source={{ uri: user.avatar_url }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>
                                {user.display_name?.charAt(0).toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}

                    {/* Name */}
                    <Text style={styles.name}>{user.display_name}</Text>

                    {/* CM Badge */}
                    {isCommunityManager && (
                        <View style={styles.cmBadge}>
                            <Crown size={16} color={SOUP_COLORS.blue} />
                            <Text style={styles.cmBadgeText}>Community Manager</Text>
                        </View>
                    )}

                    {/* Tagline */}
                    {user.tagline && (
                        <Text style={styles.tagline}>"{user.tagline}"</Text>
                    )}

                    {/* Languages I Speak */}
                    {user.fluent_languages && user.fluent_languages.length > 0 && (
                        <View style={styles.languageSection}>
                            <Text style={styles.languageLabel}>I speak:</Text>
                            <View style={styles.flagsRow}>
                                {user.fluent_languages.map((lang, idx) => (
                                    <Text key={idx} style={styles.flag}>
                                        {getLanguageFlag(lang)}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Languages I'm Learning */}
                    {user.learning_languages && user.learning_languages.length > 0 && (
                        <View style={styles.languageSection}>
                            <Text style={styles.languageLabel}>Learning:</Text>
                            <View style={styles.flagsRow}>
                                {user.learning_languages.map((lang, idx) => (
                                    <Text key={idx} style={styles.flag}>
                                        {getLanguageFlag(lang)}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Stats Card */}
                    <View style={styles.statsCard}>
                        <View style={styles.statRow}>
                            <Text style={styles.statIcon}>🎙️</Text>
                            <Text style={styles.statText}>Voice Memos: {user.voice_memos_sent || 0}</Text>
                        </View>

                        {user.soup_flavor && (
                            <View style={styles.statRow}>
                                <Text style={styles.statIcon}>🍜</Text>
                                <Text style={styles.statText}>Soup: {user.soup_flavor}</Text>
                            </View>
                        )}
                    </View>

                    {/* Promote to CM Button (Admin Only) */}
                    {isAdmin && userId !== currentUserId && (
                        <Pressable
                            style={styles.promoteButton}
                            onPress={() => setShowGroupSelector(true)}
                        >
                            <Crown size={20} color="#fff" />
                            <Text style={styles.promoteButtonText}>
                                {isCommunityManager ? 'Manage CM Groups' : 'Promote to Community Manager'}
                            </Text>
                        </Pressable>
                    )}
                </ScrollView>

                {/* Group Selector Modal */}
                <GroupSelectorModal
                    visible={showGroupSelector}
                    groups={availableGroups}
                    selectedGroups={managedGroups}
                    onToggleGroup={(groupId) => {
                        setManagedGroups(prev =>
                            prev.includes(groupId)
                                ? prev.filter(id => id !== groupId)
                                : [...prev, groupId]
                        );
                    }}
                    onSave={handlePromoteToCM}
                    onClose={() => setShowGroupSelector(false)}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        alignItems: 'center',
        paddingTop: 120,
        paddingBottom: 60,
        paddingHorizontal: 20,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        marginBottom: 20,
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 56,
        fontWeight: '700',
        color: '#fff',
    },
    name: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
        marginBottom: 8,
        textAlign: 'center',
    },
    cmBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 8,
    },
    cmBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    tagline: {
        fontSize: 16,
        fontStyle: 'italic',
        color: '#666',
        marginBottom: 32,
        textAlign: 'center',
    },
    languageSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    languageLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    flagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    flag: {
        fontSize: 28,
    },
    statsCard: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        marginTop: 20,
        gap: 12,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statIcon: {
        fontSize: 20,
    },
    statText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    promoteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: SOUP_COLORS.blue,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 20,
        width: '100%',
        justifyContent: 'center',
    },
    promoteButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
