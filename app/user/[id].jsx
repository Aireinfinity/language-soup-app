/**
 * User profile screen: opens instantly with passed-in params,
 * then loads full profile, levels, wall (reactions + posts) in the background.
 * Brand colors, bold design, collapsible wall, DM / Edit / Chat with Noah.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import { ChevronLeft, ChevronDown, ChevronUp, MessageCircle, Edit2, Instagram, Linkedin, Music2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getLanguageFlag } from '../../utils/languageFlags';
import { getAvatarSource } from '../../utils/soupUtils';
import { computeLevelsFromStats, getOutputLevel, getInputLevel } from '../../utils/levelHelpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(320, SCREEN_WIDTH * 1.1);
const FROSTED_CARD_OVERLAP = 48;

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
    const { user: currentUser, signOut } = useAuth();

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
    const [wallReactionsExpanded, setWallReactionsExpanded] = useState(false);
    const [wallDraft, setWallDraft] = useState('');
    const [postingWall, setPostingWall] = useState(false);
    const [userGroups, setUserGroups] = useState([]);
    const scrollRef = useRef(null);

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

                const { data: memberRows } = await supabase
                    .from('app_group_members')
                    .select('group_id')
                    .eq('user_id', id);
                const gids = (memberRows || []).map((r) => r.group_id).filter(Boolean);
                if (gids.length > 0) {
                    const { data: groupRows } = await supabase
                        .from('app_groups')
                        .select('id, name, language')
                        .in('id', gids);
                    setUserGroups(groupRows || []);
                } else {
                    setUserGroups([]);
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
            console.warn('Wall post failed:', e?.message ?? e);
            const msg = (e?.message && e.message.length < 80) ? e.message : 'Could not post. Try again.';
            Alert.alert('Error', msg);
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
    const nameAccent = [SOUP_COLORS.blue, SOUP_COLORS.pink, SOUP_COLORS.green][((id || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 3];

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
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: SOUP_COLORS.cream }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? (insets.top + 56) : 0}
        >
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}>
                    <ChevronLeft size={28} color={SOUP_COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>profile</Text>
                {isOwnProfile && (
                    <Pressable style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.8 }]} onPress={() => router.replace('/profile-modal')}>
                        <Edit2 size={22} color={SOUP_COLORS.text} />
                    </Pressable>
                )}
                {!isOwnProfile && isBot && (
                    <Pressable style={({ pressed }) => [styles.headerDmButton, styles.headerChatNoahBtn, pressed && { opacity: 0.9 }]} onPress={() => router.push('/support-chat')}>
                        <MessageCircle size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.headerDmButtonText}>Chat with Noah</Text>
                    </Pressable>
                )}
                {!isOwnProfile && !isBot && (
                    <Pressable style={({ pressed }) => [styles.headerDmButton, pressed && { opacity: 0.9 }]} onPress={handleSendMessage}>
                        <MessageCircle size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.headerDmButtonText}>Send a DM</Text>
                    </Pressable>
                )}
            </View>

            {loading && (
                <View style={styles.loadingBar}>
                    <ActivityIndicator size="small" color={SOUP_COLORS.pink} />
                </View>
            )}

            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {/* Hero: full-bleed avatar/placeholder (inspiration: Jane Foster / Miranda Jones) */}
                <View style={[styles.heroWrap, { height: HERO_HEIGHT }]}>
                    {avatarUrl ? (
                        <Image source={getAvatarSource(avatarUrl)} style={styles.heroImage} resizeMode="cover" />
                    ) : (
                        <View style={[styles.heroPlaceholder, { backgroundColor: isBot ? SOUP_COLORS.pink : SOUP_COLORS.blue }]}>
                            <Text style={styles.heroInitial}>{initial}</Text>
                        </View>
                    )}
                </View>

                {/* Frosted card overlay (inspiration: frosted glass card) */}
                <View style={styles.frostedCardWrap}>
                    {Platform.OS === 'ios' ? (
                        <BlurView intensity={72} tint="light" style={styles.frostedCard} />
                    ) : null}
                    <View style={[styles.frostedCardContent, Platform.OS === 'android' && styles.frostedCardContentAndroid]}>
                        <Text style={[styles.name, styles.nameCentered, { color: nameAccent }]}>{displayName}</Text>
                        <View style={[styles.statsRow, styles.statsRowCentered]}>
                            {levels ? (
                                <Text style={styles.statsText}>🎤 Lv.{levels.speakLevel} · 👂 Lv.{levels.listenLevel}</Text>
                            ) : (
                                <Text style={styles.statsText}>🎤 · 👂</Text>
                            )}
                        </View>
                        {statusText ? (
                            <View style={styles.taglinePill}>
                                <Text style={[styles.tagline, styles.taglineCentered]}>"{statusText}"</Text>
                            </View>
                        ) : null}

                        {/* Level bars (same as profile tab) */}
                        {!isBot && stats && (() => {
                            const totalSpeakSeconds = stats.total_speaking_seconds ?? 0;
                            const speakMinutes = totalSpeakSeconds / 60;
                            const listenHours = (totalSpeakSeconds * 2) / 3600;
                            const outLevel = getOutputLevel(speakMinutes);
                            const inLevel = getInputLevel(listenHours);
                            const outProgress = outLevel.maxed ? 100 : Math.min(100, Math.max(5, ((speakMinutes - outLevel.prevGoal) / (outLevel.nextGoal - outLevel.prevGoal)) * 100));
                            const inProgress = inLevel.maxed ? 100 : Math.min(100, Math.max(5, ((listenHours - inLevel.prevGoal) / (inLevel.nextGoal - inLevel.prevGoal)) * 100));
                            return (
                                <View style={styles.levelBarsSection}>
                                    <Text style={styles.sectionTitle}>levels</Text>
                                    <View style={styles.levelBarCard}>
                                        <View style={styles.levelBarHeader}>
                                            <Text style={styles.levelBarLabel}>🗣️ Out the Mouth</Text>
                                            <View style={[styles.levelBarBadge, { backgroundColor: '#ec008b' }]}>
                                                <Text style={styles.levelBarBadgeText}>Lv.{outLevel.level}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.levelBarName}>{outLevel.name}</Text>
                                        <View style={styles.levelBarTrack}>
                                            <View style={[styles.levelBarFill, { width: `${outProgress}%`, backgroundColor: '#ec008b' }]} />
                                        </View>
                                        <Text style={styles.levelBarFooter}>
                                            {Math.floor(speakMinutes)} mins spoken{outLevel.maxed ? ' (maxed!)' : ` / ${outLevel.nextGoal} to next`}
                                        </Text>
                                    </View>
                                    <View style={styles.levelBarCard}>
                                        <View style={styles.levelBarHeader}>
                                            <Text style={styles.levelBarLabel}>🧠 In the Brain</Text>
                                            <View style={[styles.levelBarBadge, { backgroundColor: '#00adef' }]}>
                                                <Text style={styles.levelBarBadgeText}>Lv.{inLevel.level}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.levelBarName}>{inLevel.name}</Text>
                                        <View style={styles.levelBarTrack}>
                                            <View style={[styles.levelBarFill, { width: `${inProgress}%`, backgroundColor: '#00adef' }]} />
                                        </View>
                                        <Text style={styles.levelBarFooter}>
                                            {(listenHours).toFixed(1)} hours listened{inLevel.maxed ? ' (maxed!)' : ` / ${inLevel.nextGoal} to next`}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()}

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>bio</Text>
                            {bio ? <Text style={styles.bioText}>{bio}</Text> : <Text style={styles.bioEmpty}>No bio yet.</Text>}
                        </View>

                        {allLanguages.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>language soup</Text>
                                <View style={styles.langChipsRow}>
                                    {allLanguages.map((lang, i) => (
                                        <View key={i} style={styles.langChip}>
                                            <Text style={styles.langChipEmoji}>{getLanguageFlag(lang)}</Text>
                                            <Text style={styles.langChipText}>{lang}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {userGroups.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>groups ({userGroups.length})</Text>
                                <View style={styles.groupsList}>
                                    {userGroups.map((g) => (
                                        <Pressable
                                            key={g.id}
                                            style={({ pressed }) => [styles.groupRow, pressed && { opacity: 0.8 }]}
                                            onPress={() => router.push(`/chat/${g.id}`)}
                                        >
                                            <Text style={styles.groupRowName}>{g.name === 'DM' ? 'DM' : g.name}</Text>
                                            {g.language ? <Text style={styles.groupRowLang}>{g.language}</Text> : null}
                                            <ChevronLeft size={18} color={SOUP_COLORS.subtext} style={{ transform: [{ rotate: '180deg' }] }} />
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        )}

                        {isBot && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>follow us</Text>
                                <Text style={styles.followSubtitle}>we're on the gram, linkedin, and tiktok. say hi.</Text>
                                <View style={styles.socialRow}>
                                    <Pressable style={({ pressed }) => [styles.socialCard, pressed && { opacity: 0.9 }]} onPress={() => Linking.openURL('https://www.instagram.com/languagesoup/')}>
                                        <Instagram size={22} color={SOUP_COLORS.pink} />
                                        <Text style={styles.socialLabel}>Instagram</Text>
                                    </Pressable>
                                    <Pressable style={({ pressed }) => [styles.socialCard, pressed && { opacity: 0.9 }]} onPress={() => Linking.openURL('https://www.linkedin.com/in/noahaire/')}>
                                        <Linkedin size={22} color={SOUP_COLORS.blue} />
                                        <Text style={styles.socialLabel}>LinkedIn</Text>
                                    </Pressable>
                                    <Pressable style={({ pressed }) => [styles.socialCard, pressed && { opacity: 0.9 }]} onPress={() => Linking.openURL('https://www.tiktok.com/@language.soup')}>
                                        <Music2 size={22} color={SOUP_COLORS.text} />
                                        <Text style={styles.socialLabel}>TikTok</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}

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
                                    {(wallReactionsExpanded ? wallReactions : wallReactions.slice(0, 3)).map((r, i) => (
                                        <View key={'r-' + i} style={styles.reactionWallItem}>
                                            <Text style={styles.reactionWallEmoji}>{r.emoji}</Text>
                                            <Text style={styles.reactionWallItemText}>
                                                <Text style={styles.reactionWallBold}>{r.reactorName}</Text> reacted
                                            </Text>
                                        </View>
                                    ))}
                                    {wallReactions.length > 3 && !wallReactionsExpanded && (
                                        <Pressable onPress={() => setWallReactionsExpanded(true)} style={({ pressed }) => pressed && { opacity: 0.8 }}>
                                            <Text style={styles.wallMoreLink}>+{wallReactions.length - 3} more</Text>
                                        </Pressable>
                                    )}
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
                                        onFocus={() => {
                                            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
                                        }}
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

                        {isOwnProfile && (
                            <Pressable
                                style={({ pressed }) => [styles.ctaButton, styles.signOutButton, pressed && { opacity: 0.9 }]}
                                onPress={() => signOut()}
                            >
                                <Text style={styles.ctaButtonText}>sign out</Text>
                            </Pressable>
                        )}
                        {isBot && (
                            <Pressable
                                style={({ pressed }) => [styles.ctaButton, styles.chatNoahButton, pressed && { opacity: 0.9 }]}
                                onPress={() => router.push('/support-chat')}
                            >
                                <MessageCircle size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.ctaButtonText}>Chat with Noah</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                <View style={{ height: insets.bottom + 32 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    headerDmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
    },
    headerDmButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
    headerChatNoahBtn: {
        backgroundColor: SOUP_COLORS.pink,
    },
    errorText: { padding: 24, fontSize: 16, color: SOUP_COLORS.subtext },
    loadingBar: { paddingVertical: 8, alignItems: 'center' },
    scroll: { flex: 1 },
    scrollContent: {
        paddingBottom: 24,
        alignItems: 'center',
        paddingHorizontal: 0,
    },
    heroWrap: {
        width: '100%',
        overflow: 'hidden',
        marginTop: 0,
    },
    heroImage: { width: '100%', height: '100%' },
    heroPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroInitial: { fontSize: 72, fontWeight: '800', color: '#fff' },
    frostedCardWrap: {
        width: '100%',
        marginTop: -FROSTED_CARD_OVERLAP,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 8,
        backgroundColor: SOUP_COLORS.cream,
    },
    frostedCard: {
        ...StyleSheet.absoluteFillObject,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    frostedCardContent: {
        borderRadius: 24,
        paddingTop: 8,
        paddingBottom: 16,
        alignItems: 'center',
    },
    frostedCardContentAndroid: {
        backgroundColor: 'rgba(253, 245, 230, 0.92)',
    },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    nameCentered: { textAlign: 'center' },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    statsRowCentered: { alignSelf: 'center' },
    taglineCentered: { textAlign: 'center' },
    statsText: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
    },
    tagline: {
        fontSize: 15,
        fontStyle: 'italic',
        color: SOUP_COLORS.text,
    },
    taglinePill: {
        alignSelf: 'center',
        marginTop: 4,
        marginBottom: 16,
        paddingLeft: 12,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
    },
    section: { width: '100%', marginBottom: 24 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 10,
    },
    levelBarsSection: { width: '100%', marginBottom: 24 },
    levelBarCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
    },
    levelBarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    levelBarLabel: { fontSize: 14, fontWeight: '700', color: SOUP_COLORS.text },
    levelBarBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    levelBarBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    levelBarName: { fontSize: 12, color: SOUP_COLORS.subtext, marginBottom: 8 },
    levelBarTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' },
    levelBarFill: { height: '100%', borderRadius: 4 },
    levelBarFooter: { fontSize: 11, color: SOUP_COLORS.subtext, marginTop: 6 },
    langChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    langChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,173,239,0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.blue,
    },
    langChipEmoji: { fontSize: 18 },
    langChipText: { fontSize: 13, fontWeight: '700', color: SOUP_COLORS.text },
    groupsList: { gap: 8 },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 8,
    },
    groupRowName: { flex: 1, fontSize: 15, fontWeight: '700', color: SOUP_COLORS.text },
    groupRowLang: { fontSize: 13, color: SOUP_COLORS.subtext },
    followSubtitle: { fontSize: 14, color: SOUP_COLORS.subtext, marginBottom: 12 },
    socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    socialCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        gap: 8,
    },
    socialLabel: { fontSize: 14, fontWeight: '700', color: SOUP_COLORS.text },
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
    wallMoreLink: { fontSize: 14, fontWeight: '700', color: SOUP_COLORS.blue, marginTop: 4 },
    headerIconBtn: { padding: 8 },
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
    signOutButton: { backgroundColor: SOUP_COLORS.pink, shadowColor: SOUP_COLORS.pink },
    chatNoahButton: { backgroundColor: SOUP_COLORS.pink, shadowColor: SOUP_COLORS.pink },
});
