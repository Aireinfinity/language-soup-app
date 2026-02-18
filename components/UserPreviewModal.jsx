import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Image, Dimensions, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { X, MessageCircle, Edit2 } from 'lucide-react-native';
import { getLanguageFlag } from '../utils/languageFlags';
import { getAvatarSource } from '../utils/soupUtils';
import { computeLevelsFromStats } from '../utils/levelHelpers';

const { width } = Dimensions.get('window');

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
    green: '#19b091',
    text: '#2d3436',
    subtext: '#636e72',
};

export function UserPreviewModal({ visible, user: targetUser, onClose }) {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [wallReactions, setWallReactions] = useState([]);

    const isOwnProfile = currentUser?.id && targetUser?.id && currentUser.id === targetUser.id;

    const userId = targetUser?.id ?? targetUser?.user_id;
    const levels = stats ? computeLevelsFromStats(stats) : null;

    // Show card immediately with targetUser; fetch full profile, stats, and reaction wall in background
    useEffect(() => {
        if (!visible || !targetUser) return;
        const uid = targetUser.id ?? targetUser.user_id;
        if (!uid) {
            setProfile(targetUser);
            setStats(null);
            setWallReactions([]);
            return;
        }
        setLoading(true);
        setStats(null);
        setWallReactions([]);
        (async () => {
            try {
                const [profileRes, statsRes] = await Promise.all([
                    supabase.from('app_users').select('*').eq('id', uid).single(),
                    supabase.rpc('get_user_stats', { uid }),
                ]);
                if (profileRes.error) throw profileRes.error;
                setProfile(profileRes.data || targetUser);
                if (statsRes.data) setStats(statsRes.data);

                // Reactions on this user's messages (message sender = this user)
                const { data: messages } = await supabase
                    .from('app_messages')
                    .select('id')
                    .eq('sender_id', uid)
                    .limit(300);
                const messageIds = (messages || []).map((m) => m.id);
                if (messageIds.length === 0) {
                    setWallReactions([]);
                    return;
                }
                const { data: reactions } = await supabase
                    .from('app_message_reactions')
                    .select('*')
                    .in('message_id', messageIds)
                    .order('created_at', { ascending: false })
                    .limit(40);
                if (!reactions?.length) {
                    setWallReactions([]);
                    return;
                }
                const reactorIds = [...new Set(reactions.map((r) => r.user_id))];
                const { data: users } = await supabase
                    .from('app_users')
                    .select('id, display_name')
                    .in('id', reactorIds);
                const nameBy = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.display_name || 'Someone' }), {});
                setWallReactions(
                    reactions.map((r) => ({
                        emoji: r.emoji ?? r.reaction ?? '❤️',
                        createdAt: r.created_at,
                        reactorName: nameBy[r.user_id] || 'Someone',
                    }))
                );
            } catch (e) {
                console.warn('[UserPreviewModal] fetch failed:', e);
                setProfile(targetUser);
            } finally {
                setLoading(false);
            }
        })();
    }, [visible, targetUser?.id, targetUser?.user_id]);

    const user = profile || targetUser;
    if (!targetUser) return null;

    const displayName = user?.display_name || 'Anonymous';
    const avatarUrl = user?.avatar_url;
    const statusText = user?.status_text;
    const bio = user?.bio?.trim();
    const initial = displayName?.[0]?.toUpperCase() || '?';

    const handleSendMessage = async () => {
        if (!currentUser || !targetUser) return;

        try {
            const { data: myGroups } = await supabase
                .from('app_group_members')
                .select('group_id, app_groups(name)')
                .eq('user_id', currentUser.id);

            const myGroupIds = myGroups?.map(g => g.group_id) || [];

            if (myGroupIds.length > 0) {
                const { data: commonGroups } = await supabase
                    .from('app_group_members')
                    .select('group_id')
                    .eq('user_id', targetUser.id)
                    .in('group_id', myGroupIds);

                const commonGroupIds = commonGroups?.map(g => g.group_id) || [];
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

            const { data: newGroup, error: createError } = await supabase
                .from('app_groups')
                .insert({
                    name: 'DM',
                    language: targetUser.fluent_languages?.[0] || 'English',
                    level: 'N/A',
                    is_public: false,
                    member_count: 2,
                })
                .select()
                .single();

            if (createError) throw createError;

            await supabase
                .from('app_group_members')
                .insert([
                    { group_id: newGroup.id, user_id: currentUser.id },
                    { group_id: newGroup.id, user_id: targetUser.id }
                ]);

            onClose();
            router.push(`/chat/${newGroup.id}`);
        } catch (error) {
            console.error('Error starting DM:', error);
            Alert.alert('Error', 'Could not start chat. Please try again.');
        }
    };

    const learningLanguages = user?.learning_languages || [];
    const fluentLanguages = user?.fluent_languages || [];
    const allLanguages = [...new Set([...learningLanguages, ...fluentLanguages])];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#fff" />
                    </Pressable>

                    {loading && <View style={styles.loadingBar}><ActivityIndicator size="small" color={SOUP_COLORS.blue} /></View>}

                    <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Photo: big card shape (no circle, no outline) */}
                            <View style={styles.heroWrap}>
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
                            </View>

                            {/* Dynamic levels from this user's stats */}
                            <View style={styles.levelsRow}>
                                {levels ? (
                                    <>
                                        <Text style={styles.levelsLabel}>🎤 Lv.{levels.speakLevel} · 👂 Lv.{levels.listenLevel}</Text>
                                        <Text style={styles.levelsHint}>{levels.speakName} · {levels.listenName}</Text>
                                    </>
                                ) : (
                                    <>
                                        <Text style={styles.levelsLabel}>🎤 · 👂</Text>
                                        <Text style={styles.levelsHint}>levels</Text>
                                    </>
                                )}
                            </View>

                            {/* Name */}
                            <Text style={styles.name}>{displayName}</Text>

                            {/* Tagline */}
                            {statusText ? (
                                <Text style={styles.tagline}>"{statusText}"</Text>
                            ) : null}

                            {/* Languages */}
                            {allLanguages.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>language soup</Text>
                                    <View style={styles.flagsContainer}>
                                        {allLanguages.map((lang, i) => (
                                            <View key={i} style={styles.flagPill}>
                                                <Text style={styles.flagEmoji}>{getLanguageFlag(lang)}</Text>
                                                <Text style={styles.flagLabel}>{lang}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Bio */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>bio</Text>
                                {bio ? (
                                    <Text style={styles.bioText}>{bio}</Text>
                                ) : (
                                    <Text style={styles.bioEmpty}>No bio yet.</Text>
                                )}
                            </View>

                            {/* Reaction wall: dynamic from reactions on this user's messages */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>{isOwnProfile ? 'your wall' : 'reactions from others'}</Text>
                                <View style={styles.reactionWallPlaceholder}>
                                    {wallReactions.length > 0 ? (
                                        wallReactions.map((r, i) => (
                                            <View key={i} style={styles.reactionWallItem}>
                                                <Text style={styles.reactionWallEmoji}>{r.emoji}</Text>
                                                <Text style={styles.reactionWallItemText}>
                                                    <Text style={styles.reactionWallBold}>{r.reactorName}</Text> reacted to your messages
                                                </Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.reactionWallText}>
                                            {isOwnProfile ? 'Reactions to your voice messages show up here.' : 'No reactions yet. Be the first to react to their messages!'}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Own profile: Edit; others: Send message */}
                            {isOwnProfile ? (
                                <Pressable
                                    style={({ pressed }) => [styles.messageButton, styles.editButton, pressed && { opacity: 0.9 }]}
                                    onPress={() => { onClose(); router.push('/profile-modal'); }}
                                >
                                    <Edit2 size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.messageButtonText}>Edit profile</Text>
                                </Pressable>
                            ) : (
                                <Pressable
                                    style={({ pressed }) => [styles.messageButton, pressed && { opacity: 0.9 }]}
                                    onPress={handleSendMessage}
                                >
                                    <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.messageButtonText}>Send message</Text>
                                </Pressable>
                            )}

                            <View style={{ height: 32 }} />
                        </ScrollView>
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
        maxWidth: 400,
        maxHeight: '90%',
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
    loadingBar: {
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    scroll: { flex: 1 },
    scrollContent: {
        paddingBottom: 24,
        alignItems: 'center',
    },
    heroWrap: {
        width: '100%',
        aspectRatio: 1,
        maxHeight: 280,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroInitial: {
        fontSize: 72,
        fontWeight: '700',
        color: '#fff',
    },
    levelsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 16,
        gap: 6,
    },
    levelsLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    levelsHint: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginTop: 8,
        marginBottom: 4,
    },
    tagline: {
        fontSize: 15,
        fontStyle: 'italic',
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 16,
        lineHeight: 22,
    },
    section: {
        width: '100%',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    flagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    flagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.cream,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    flagEmoji: { fontSize: 18 },
    flagLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    bioText: {
        fontSize: 15,
        color: SOUP_COLORS.text,
        lineHeight: 22,
    },
    bioEmpty: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
    },
    reactionWallPlaceholder: {
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    reactionWallItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    reactionWallEmoji: { fontSize: 18 },
    reactionWallBold: { fontWeight: '700', color: SOUP_COLORS.text },
    reactionWallItemText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        flex: 1,
    },
    reactionWallText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 24,
        width: '100%',
        marginHorizontal: 20,
    },
    messageButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    editButton: {
        backgroundColor: SOUP_COLORS.green,
    },
});
