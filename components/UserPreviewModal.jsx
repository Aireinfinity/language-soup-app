import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal, View, Text, Pressable, StyleSheet, Image, Dimensions, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import { getLanguageFlag } from '../utils/languageFlags';
import { getAvatarSource } from '../utils/soupUtils';

const { width } = Dimensions.get('window');

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

export function UserPreviewModal({ visible, user: targetUser, onClose }) {
    const { user: currentUser } = useAuth();
    const router = useRouter();

    if (!targetUser) return null;

    const displayName = targetUser?.display_name || 'Anonymous';
    const avatarUrl = targetUser?.avatar_url;
    const statusText = targetUser?.status_text;
    const initial = displayName?.[0]?.toUpperCase() || '?';

    const handleSendMessage = async () => {
        if (!currentUser || !targetUser) return;

        try {
            // 1. Find existing DM group
            // Algorithm: Find group where BOTH users are members and group.name == 'DM' (or special flag)
            // Simplified: Fetch my groups, filter for one where targetUser is also a member and name is 'DM'

            const { data: myGroups } = await supabase
                .from('app_group_members')
                .select('group_id, app_groups(name)')
                .eq('user_id', currentUser.id);

            const myGroupIds = myGroups?.map(g => g.group_id) || [];

            if (myGroupIds.length > 0) {
                // Check if target matches any of these
                const { data: commonGroups } = await supabase
                    .from('app_group_members')
                    .select('group_id')
                    .eq('user_id', targetUser.id)
                    .in('group_id', myGroupIds);

                // Filter for "DM" name
                const commonGroupIds = commonGroups?.map(g => g.group_id) || [];

                // We need to check the group NAME locally (since we fetched it in myGroups)
                // Filter myGroups for matches
                const existingDM = myGroups.find(g =>
                    commonGroupIds.includes(g.group_id) &&
                    g.app_groups?.name === 'DM'
                );

                if (existingDM) {
                    onClose();
                    router.push(`/chat/${existingDM.group_id}`);
                    return;
                }
            }

            // 2. Create new DM group if none exists
            // Create group
            const { data: newGroup, error: createError } = await supabase
                .from('app_groups')
                .insert({
                    name: 'DM', // Special name to identify DMs
                    language: targetUser.fluent_languages?.[0] || 'English', // Default language
                    level: 'N/A',
                    is_public: false, // DMs are private
                    member_count: 2,
                    avatar_url: targetUser.avatar_url // Initially use target avatar? No, leave null for "DM"
                })
                .select()
                .single();

            if (createError) throw createError;

            // Add members
            const { error: memberError } = await supabase
                .from('app_group_members')
                .insert([
                    { group_id: newGroup.id, user_id: currentUser.id },
                    { group_id: newGroup.id, user_id: targetUser.id }
                ]);

            if (memberError) throw memberError;

            onClose();
            router.push(`/chat/${newGroup.id}`);

        } catch (error) {
            console.error('Error starting DM:', error);
            Alert.alert('Error', 'Could not start chat. Please try again.');
        }
    };

    const learningLanguages = targetUser.learning_languages || [];
    const fluentLanguages = targetUser.fluent_languages || [];
    const allLanguages = [...new Set([...learningLanguages, ...fluentLanguages])];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    {/* Close button */}
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#fff" />
                    </Pressable>

                    {/* Large Pinterest-style image */}
                    {avatarUrl ? (
                        <Image
                            source={getAvatarSource(avatarUrl)}
                            style={styles.heroImage}
                        />
                    ) : (
                        <View style={styles.heroPlaceholder}>
                            <Text style={styles.heroInitial}>{initial}</Text>
                        </View>
                    )}

                    {/* Content section */}
                    <View style={styles.content}>
                        {/* Name */}
                        <Text style={styles.name}>{displayName}</Text>

                        {/* Tagline */}
                        {statusText && (
                            <Text style={styles.tagline}>"{statusText}"</Text>
                        )}

                        {/* Languages as flag pills */}
                        {allLanguages.length > 0 && (
                            <View style={styles.flagsContainer}>
                                {allLanguages.map((lang, i) => (
                                    <View key={i} style={styles.flagPill}>
                                        <Text style={styles.flagEmoji}>{getLanguageFlag(lang)}</Text>
                                        <Text style={styles.flagLabel}>{lang}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Send Message Button */}
                        <Pressable
                            style={styles.messageButton}
                            onPress={handleSendMessage}
                        >
                            <Text style={styles.messageButtonText}>Send Message</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        width: width - 48,
        maxWidth: 380,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroImage: {
        width: '100%',
        height: 280,
        backgroundColor: '#f0f0f0',
    },
    heroPlaceholder: {
        width: '100%',
        height: 280,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroInitial: {
        fontSize: 80,
        fontWeight: '700',
        color: '#fff',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 6,
    },
    tagline: {
        fontSize: 15,
        fontStyle: 'italic',
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    flagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    flagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    flagEmoji: {
        fontSize: 18,
    },
    flagLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    messageButton: {
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 24,
        width: '100%',
        alignItems: 'center',
    },
    messageButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
