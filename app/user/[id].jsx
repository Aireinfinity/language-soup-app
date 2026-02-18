/**
 * User profile screen: opens instantly with passed-in params,
 * then loads full profile, levels, wall (reactions + posts) in the background.
 * Brand colors, bold design, collapsible wall, DM / Edit / Chat with Noah.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronDown, ChevronUp, MessageCircle, Edit2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getLanguageFlag } from '../../utils/languageFlags';
import { getAvatarSource } from '../../utils/soupUtils';
import { computeLevelsFromStats } from '../../utils/levelHelpers';

const LANGUAGE_SOUP_BOT_ID = '00000000-0000-0000-0000-000000000000';

const SOUP_COLORS = {
    blue: '#00adef',
    turquoise: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
    green: '#19b091',
    text: '#1b1b2f',
    dark: '#1b1b2f',
    subtext: '#636e72',
};

const BOT_PRESET = {
    display_name: 'Language Soup',
    status_text: 'daily challenge girly 🍜',
    bio: 'I’m the official soup bot. I drop daily voice challenges so you actually speak. I don’t have feelings but I do have 32 languages and a lot of enthusiasm. Be nice to Noah, he built me.',
    speakLevel: '∞',
    listenLevel: '∞',
    speakName: 'Official Soup Bot',
    listenName: 'Hears Everything',
};

export default function UserProfileScreen() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: currentUser } = useAuth();

    const id = params.id ?? params.user_id;
    const isBot = id === LANGUAGE_SOUP_BOT_ID;

    const [user, setUser] = useState(() => ({
        id,
        user_id: id,
        display_name: params.display_name ?? 'Souper',
        avatar_url: params.avatar_url ?? null,
        status_text: params.status_text ?? null,
    }));
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [wallReactions, setWallReactions] = useState([]);
    const [wallPosts, setWallPosts] = useState([]);
    const [wallExpanded, setWallExpanded] = useState(true);
    const [wallDraft, setWallDraft] = useState('');
    const [postingWall, setPostingWall] = useState(false);

    const isOwnProfile = currentUser?.id && id && currentUser.id === id;
    const levels = !isBot && stats ? computeLevelsFromStats(stats) : (isBot ? { speakLevel: BOT_PRESET.speakLevel, listenLevel: BOT_PRESET.listenLevel, speakName: BOT_PRESET.speakName, listenName: BOT_PRESET.listenName } : null);

    useEffect(() => {
        if (!id) return;
        if (isBot) {
            setUser(prev => ({ ...prev, display_name: BOT_PRESET.display_name, status_text: BOT_PRESET.status_text, bio: BOT_PRESET.bio }));
            setLoading(false);
            return;
        }
        setLoading(true);
        (async () => {
            try {
                const [profileRes, statsRes] = await Promise.all([
                    supabase.from('app_users').select('*').eq('id', id).single(),
                    supabase.rpc('get_user_stats', { uid: id }),
                ]);
                if (profileRes.data) setUser(profileRes.data);
                if (statsRes.data) setStats(statsRes.data);

                const { data: messages } = await supabase
                    .from('app_messages')
                    .select('id')
                    .eq('sender_id', id)
                    .limit(300);
                const messageIds = (messages || []).map((m) => m.id);
                if (messageIds.length > 0) {
                    const { data: reactions } = await supabase
                        .from('app_message_reactions')
                        .select('*')
                        .in('message_id', messageIds)
                        .order('created_at', { ascending: false })
                        .limit(40);
                    if (reactions?.length) {
                        const reactorIds = [...new Set(reactions.map((r) => r.user_id))];
                        const { data: users } = await supabase.from('app_users').select('id, display_name').in('id', reactorIds);
                        const nameBy = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.display_name || 'Someone' }), {});
                        setWallReactions(reactions.map((r) => ({
                            emoji: r.emoji ?? r.reaction ?? '❤️',
                            createdAt: r.created_at,
                            reactorName: nameBy[r.user_id] || 'Someone',
                        })));
                    }
                }

                const { data: wall } = await supabase
                    .from('app_profile_wall')
                    .select('id, content, created_at, from_user_id')
                    .eq('profile_user_id', id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                if (wall?.length) {
                    const fromIds = [...new Set(wall.map((p) => p.from_user_id))];
                    const { data: fromUsers } = await supabase.from('app_users').select('id, display_name').in('id', fromIds);
                    const nameBy = (fromUsers || []).reduce((acc, u) => ({ ...acc, [u.id]: u.display_name || 'Someone' }), {});
                    setWallPosts(wall.map((p) => ({ ...p, authorName: nameBy[p.from_user_id] || 'Someone' })));
                }
            } catch (e) {
                console.warn('[UserProfile] fetch failed:', e);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isBot]);

    const handleSendMessage = async () => {
        if (!currentUser?.id || !id) return;
        try {
            const { data: myGroups } = await supabase
                .from('app_group_members')
                .select('group_id, app_groups(name)')
                .eq('user_id', currentUser.id);
            const myGroupIds = myGroups?.map((g) => g.group_id) || [];
            if (myGroupIds.length > 0) {
                const { data: commonGroups } = await supabase
                    .from('app_group_members')
                    .select('group_id')
                    .eq('user_id', id)
                    .in('group_id', myGroupIds);
                const commonGroupIds = commonGroups?.map((g) => g.group_id) || [];
                const existingDM = myGroups.find(
                    (g) => commonGroupIds.includes(g.group_id) && g.app_groups?.name === 'DM'
                );
                if (existingDM) {
                    router.replace(`/chat/${existingDM.group_id}`);
                    return;
                }
            }
            const { data: newGroup, error: createError } = await supabase
                .from('app_groups')
                .insert({
                    name: 'DM',
                    language: user?.fluent_languages?.[0] || 'English',
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
                    { group_id: newGroup.id, user_id: id },
                ]);
            router.replace(`/chat/${newGroup.id}`);
        } catch (error) {
            console.error('Error starting DM:', error);
            Alert.alert('Error', 'Could not start chat. Please try again.');
        }
    };

    const postWall = async () => {
        const content = (wallDraft || '').trim();
        if (!content || !currentUser?.id || !id || isOwnProfile || isBot) return;
        setPostingWall(true);
        try {
            const { error } = await supabase
                .from('app_profile_wall')
                .insert({ profile_user_id: id, from_user_id: currentUser.id, content });
            if (error) throw error;
            setWallPosts(prev => [{ id: null, content, created_at: new Date().toISOString(), from_user_id: currentUser.id, authorName: currentUser.display_name || 'You' }, ...prev]);
            setWallDraft('');
        } catch (e) {
            console.warn('Wall post failed:', e);
            Alert.alert('Error', 'Could not post. Try again.');
        } finally {
            setPostingWall(false);
        }
    };

    const displayName = isBot ? BOT_PRESET.display_name : (user?.display_name || 'Souper');
    const avatarUrl = user?.avatar_url;
    const statusText = isBot ? BOT_PRESET.status_text : (user?.status_text);
    const bio = isBot ? BOT_PRESET.bio : (user?.bio?.trim());
    const initial = displayName?.[0]?.toUpperCase() || '?';
    const learningLanguages = user?.learning_languages || [];
    const fluentLanguages = user?.fluent_languages || [];
    const allLanguages = [...new Set([...learningLanguages, ...fluentLanguages])];

    if (!id) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={28} color={SOUP_COLORS.text} />
                </Pressable>
                <Text style={styles.errorText}>Invalid profile</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: SOUP_COLORS.cream }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}>
                    <ChevronLeft size={28} color={SOUP_COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>profile</Text>
            </View>

            {loading && (
                <View style={styles.loadingBar}>
                    <ActivityIndicator size="small" color={SOUP_COLORS.pink} />
                </View>
            )}

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.heroWrap, styles.heroBold]}>
                    {avatarUrl ? (
                        <Image source={getAvatarSource(avatarUrl)} style={styles.heroImage} />
                    ) : (
                        <View style={[styles.heroPlaceholder, { backgroundColor: isBot ? SOUP_COLORS.pink : SOUP_COLORS.blue }]}>
                            <Text style={styles.heroInitial}>{initial}</Text>
                        </View>
                    )}
                </View>

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

                <Text style={styles.name}>{displayName}</Text>
                {statusText ? <Text style={styles.tagline}>"{statusText}"</Text> : null}

                {allLanguages.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>language soup</Text>
                        <View style={styles.flagsContainer}>
                            {allLanguages.map((lang, i) => (
                                <View key={i} style={styles.flagPill}>
                                    <Text style={styles.flagEmoji}>{getLanguageFlag(lang) ?? '🌐'}</Text>
                                    <Text style={styles.flagLabel}>{lang}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>bio</Text>
                    {bio ? <Text style={styles.bioText}>{bio}</Text> : <Text style={styles.bioEmpty}>No bio yet.</Text>}
                </View>

                <View style={styles.section}>
                    <Pressable
                        style={styles.wallHeader}
                        onPress={() => setWallExpanded(!wallExpanded)}
                    >
                        <Text style={styles.sectionTitle}>{isOwnProfile ? 'your wall' : "their wall"}</Text>
                        {wallExpanded ? <ChevronUp size={20} color={SOUP_COLORS.subtext} /> : <ChevronDown size={20} color={SOUP_COLORS.subtext} />}
                    </Pressable>
                    {wallExpanded && (
                        <View style={styles.wallCard}>
                            {wallReactions.length > 0 && (
                                <>
                                    <Text style={styles.wallSubtitle}>reactions on their messages</Text>
                                    {wallReactions.map((r, i) => (
                                        <View key={'r-' + i} style={styles.reactionWallItem}>
                                            <Text style={styles.reactionWallEmoji}>{r.emoji}</Text>
                                            <Text style={styles.reactionWallItemText}>
                                                <Text style={styles.reactionWallBold}>{r.reactorName}</Text> reacted
                                            </Text>
                                        </View>
                                    ))}
                                </>
                            )}
                            {wallPosts.length > 0 && (
                                <>
                                    <Text style={styles.wallSubtitle}>notes from others</Text>
                                    {wallPosts.map((p) => (
                                        <View key={p.id || p.created_at} style={styles.wallPostItem}>
                                            <Text style={styles.wallPostAuthor}>{p.authorName}</Text>
                                            <Text style={styles.wallPostContent}>{p.content}</Text>
                                        </View>
                                    ))}
                                </>
                            )}
                            {wallReactions.length === 0 && wallPosts.length === 0 && (
                                <Text style={styles.reactionWallText}>
                                    {isOwnProfile ? 'Reactions and notes from others show up here.' : 'No reactions or notes yet.'}
                                </Text>
                            )}
                            {!isOwnProfile && !isBot && (
                                <View style={styles.wallInputRow}>
                                    <TextInput
                                        style={styles.wallInput}
                                        placeholder="say something nice…"
                                        placeholderTextColor={SOUP_COLORS.subtext}
                                        value={wallDraft}
                                        onChangeText={setWallDraft}
                                        maxLength={200}
                                        multiline
                                    />
                                    <Pressable
                                        style={[styles.wallPostBtn, (!wallDraft.trim() || postingWall) && styles.wallPostBtnDisabled]}
                                        onPress={postWall}
                                        disabled={!wallDraft.trim() || postingWall}
                                    >
                                        <Text style={styles.wallPostBtnText}>{postingWall ? '…' : 'post'}</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {isOwnProfile ? (
                    <Pressable
                        style={({ pressed }) => [styles.ctaButton, styles.editButton, pressed && { opacity: 0.9 }]}
                        onPress={() => router.replace('/profile-modal')}
                    >
                        <Edit2 size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.ctaButtonText}>Edit profile</Text>
                    </Pressable>
                ) : isBot ? (
                    <Pressable
                        style={({ pressed }) => [styles.ctaButton, styles.chatNoahButton, pressed && { opacity: 0.9 }]}
                        onPress={() => router.push('/support-chat')}
                    >
                        <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.ctaButtonText}>Chat with Noah</Text>
                    </Pressable>
                ) : (
                    <Pressable style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.9 }]} onPress={handleSendMessage}>
                        <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.ctaButtonText}>DM</Text>
                    </Pressable>
                )}

                <View style={{ height: insets.bottom + 32 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: SOUP_COLORS.blue + '20',
    },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        letterSpacing: -0.5,
    },
    errorText: { padding: 24, fontSize: 16, color: SOUP_COLORS.subtext },
    loadingBar: { paddingVertical: 8, alignItems: 'center' },
    scroll: { flex: 1 },
    scrollContent: {
        paddingBottom: 24,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    heroWrap: {
        width: '100%',
        aspectRatio: 1,
        maxHeight: 280,
        borderRadius: 24,
        overflow: 'hidden',
        marginTop: 16,
        borderWidth: 3,
        borderColor: SOUP_COLORS.blue + '25',
    },
    heroBold: {
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    heroImage: { width: '100%', height: '100%' },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroInitial: { fontSize: 72, fontWeight: '800', color: '#fff' },
    levelsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 20,
        gap: 8,
    },
    levelsLabel: { fontSize: 17, fontWeight: '800', color: SOUP_COLORS.text },
    levelsHint: { fontSize: 13, fontWeight: '600', color: SOUP_COLORS.subtext },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginTop: 10,
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    tagline: {
        fontSize: 16,
        fontStyle: 'italic',
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    section: { width: '100%', marginBottom: 24 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    flagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    flagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.cream,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: SOUP_COLORS.blue + '30',
    },
    flagEmoji: { fontSize: 20 },
    flagLabel: { fontSize: 14, fontWeight: '700', color: SOUP_COLORS.text },
    bioText: { fontSize: 16, color: SOUP_COLORS.text, lineHeight: 24 },
    bioEmpty: { fontSize: 14, color: SOUP_COLORS.subtext, fontStyle: 'italic' },
    wallHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    wallCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: SOUP_COLORS.blue + '18',
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    wallSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 4,
    },
    reactionWallItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    reactionWallEmoji: { fontSize: 20 },
    reactionWallBold: { fontWeight: '800', color: SOUP_COLORS.text },
    reactionWallItemText: { fontSize: 15, color: SOUP_COLORS.subtext, flex: 1 },
    reactionWallText: { fontSize: 14, color: SOUP_COLORS.subtext, textAlign: 'center', paddingVertical: 12 },
    wallPostItem: {
        marginBottom: 14,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    wallPostAuthor: { fontSize: 13, fontWeight: '800', color: SOUP_COLORS.pink, marginBottom: 4 },
    wallPostContent: { fontSize: 15, color: SOUP_COLORS.text, lineHeight: 22 },
    wallInputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        marginTop: 14,
    },
    wallInput: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: SOUP_COLORS.text,
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue + '30',
    },
    wallPostBtn: {
        backgroundColor: SOUP_COLORS.green,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 14,
        justifyContent: 'center',
    },
    wallPostBtnDisabled: { opacity: 0.5 },
    wallPostBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 16,
        paddingHorizontal: 36,
        borderRadius: 28,
        width: '100%',
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    editButton: { backgroundColor: SOUP_COLORS.green, shadowColor: SOUP_COLORS.green },
    chatNoahButton: { backgroundColor: SOUP_COLORS.pink, shadowColor: SOUP_COLORS.pink },
});
