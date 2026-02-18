/**
 * Feed layout: header + group switcher in bar (no left sidebar). Main = full-width group chat.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Globe, MessageCircle, Users, ChevronDown, PlusCircle } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFeed } from '../contexts/FeedContext';
import { supabase } from '../lib/supabase';
import { getAvatarSource } from '../utils/soupUtils';
import { haptics } from '../utils/haptics';
import { computeLevelsFromStats } from '../utils/levelHelpers';
import GroupAvatar from './GroupAvatar';
import { LevelsInfoSheet } from './LevelsInfoSheet';
import { LevelsPill } from './LevelsPill';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

// Dynamic levels from get_user_stats (speak = output minutes, listen = estimated from 2× speak)
function useLevels(userId) {
    const [levels, setLevels] = useState({ speak: 1, listen: 1 });
    useEffect(() => {
        if (!userId) return;
        (async () => {
            const { data } = await supabase.rpc('get_user_stats', { uid: userId });
            if (data) {
                const { speakLevel, listenLevel } = computeLevelsFromStats(data);
                setLevels({ speak: speakLevel, listen: listenLevel });
            }
        })();
    }, [userId]);
    return levels;
}

export function FeedLayout({ children }) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user } = useAuth();
    const { selectedGroupId, setSelectedGroupId, LANGUAGE_SOUP_GROUP_ID: LS_ID } = useFeed();
    const [userDisplayName, setUserDisplayName] = useState('');
    const [userTagline, setUserTagline] = useState('');
    const [userAvatarUrl, setUserAvatarUrl] = useState(null);
    const [chatGroups, setChatGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [showGroupPicker, setShowGroupPicker] = useState(false);
    const [showLevelsInfo, setShowLevelsInfo] = useState(false);
    const levels = useLevels(user?.id);

    const isLanguageSoup = selectedGroupId === null || selectedGroupId === LS_ID;
    const currentGroup = chatGroups.find((g) => g.id === selectedGroupId);

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            const { data } = await supabase.from('app_users').select('display_name, status_text, avatar_url').eq('id', user.id).single();
            if (data) {
                setUserDisplayName(data.display_name || 'Souper');
                setUserTagline((data.status_text || '').trim());
                setUserAvatarUrl(data.avatar_url);
            }
        })();
    }, [user?.id]);

    const loadGroups = useCallback(async () => {
        if (!user?.id) return;
        try {
            const { data: memberships, error } = await supabase
                .from('app_group_members')
                .select('group_id, app_groups(id, name, language, member_count, avatar_url)')
                .eq('user_id', user.id);
            if (error) throw error;
            const list = (memberships || [])
                .map((m) => m.app_groups)
                .filter(Boolean)
                .filter((g) => g.id && !g.name?.toLowerCase().includes('support'));
            // Language Soup always first for everyone (inject if not in memberships)
            const ls = list.find((g) => g.id === LS_ID) || { id: LS_ID, name: 'Language Soup', language: 'Language Soup' };
            const rest = list.filter((g) => g.id !== LS_ID);
            setChatGroups([ls, ...rest]);
        } catch (e) {
            console.warn('FeedLayout loadGroups:', e);
        } finally {
            setLoadingGroups(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    const displayName = userDisplayName?.trim() || 'Souper';

    // Full language/group name for at-a-glance sidebar (cap length so it fits)
    const groupLabel = (g) => {
        const name = (g.language || g.name || '').trim();
        if (!name) return 'Group';
        // Keep full language names; truncate long custom names
        if (name.length <= 14) return name;
        return name.slice(0, 12) + '…';
    };

    // Short label for collapsed sidebar pill (e.g. "LS", "Fr")
    const groupShortLabel = (g) => {
        if (g.id === LS_ID) return 'LS';
        const lang = g.language || g.name || '';
        if (lang.toLowerCase().includes('english')) return 'En';
        if (lang.toLowerCase().includes('french')) return 'Fr';
        if (lang.toLowerCase().includes('spanish')) return 'Es';
        if (lang.toLowerCase().includes('german')) return 'De';
        if (lang.length >= 2) return lang.slice(0, 2);
        return lang.slice(0, 1) || '?';
    };

    return (
        <View style={styles.container}>
            {/* Compact header so group chat is the main focus */}
            <View style={[styles.homeHeader, { paddingTop: insets.top + 6 }]}>
                <Pressable
                    style={({ pressed }) => [styles.homeHeaderLeft, pressed && { opacity: 0.85 }]}
                    onPress={() => {
                        try { haptics.light(); } catch (_) {}
                        if (user?.id) {
                            router.push({
                                pathname: `/user/${user.id}`,
                                params: {
                                    display_name: userDisplayName || '',
                                    status_text: userTagline || '',
                                    avatar_url: userAvatarUrl || '',
                                },
                            });
                        } else {
                            router.push('/profile-modal');
                        }
                    }}
                >
                    <View style={styles.homeHeaderAvatarCard}>
                        {userAvatarUrl ? (
                            <Image source={getAvatarSource(userAvatarUrl)} style={styles.homeHeaderAvatarImg} />
                        ) : (
                            <View style={styles.homeHeaderAvatarPlaceholder}>
                                <Text style={styles.homeHeaderAvatarLetter}>{displayName[0]?.toUpperCase() || '?'}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.homeHeaderNameWrap}>
                        <Text style={styles.homeHeaderTitle} numberOfLines={1}>{displayName}</Text>
                        {userTagline ? <Text style={styles.homeHeaderTagline} numberOfLines={1}>{userTagline}</Text> : null}
                    </View>
                </Pressable>
                <LevelsPill
                    speakLevel={levels.speak}
                    listenLevel={levels.listen}
                    onPress={() => { try { haptics.light(); } catch (_) {} setShowLevelsInfo(true); }}
                />
            </View>

            {/* Group banner: full width, obvious "tap to switch" */}
            <Pressable
                style={({ pressed }) => [styles.groupBanner, pressed && { opacity: 0.95 }]}
                onPress={() => { try { haptics.light(); } catch (_) {} setShowGroupPicker(true); }}
            >
                <View style={styles.groupBannerRow}>
                    <Text style={styles.groupBannerLabel} numberOfLines={1}>
                        {isLanguageSoup ? '🥣 Language Soup' : (currentGroup?.name || currentGroup?.language || 'Group')}
                    </Text>
                    <ChevronDown size={20} color={SOUP_COLORS.subtext} style={{ marginLeft: 8 }} />
                </View>
                <Text style={styles.groupBannerHint}>tap to switch group</Text>
            </Pressable>

            <View style={[styles.main, { paddingBottom: insets.bottom }]}>
                {children}
            </View>

            {/* Group picker modal: groups, DMs, chat with Noah, join more */}
            <Modal visible={showGroupPicker} transparent animationType="fade">
                <Pressable style={styles.pickerOverlay} onPress={() => setShowGroupPicker(false)}>
                    <Pressable style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>choose where to chat</Text>
                        <Text style={styles.pickerSubtitle}>tap a group to switch. Language Soup = all your groups in one feed.</Text>
                        <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                            <Pressable
                                style={({ pressed }) => [styles.pickerItemBig, (selectedGroupId === null || selectedGroupId === LS_ID) && styles.pickerItemActive, pressed && { opacity: 0.9 }]}
                                onPress={() => { try { haptics.light(); } catch (_) {} setSelectedGroupId(null); setShowGroupPicker(false); }}
                            >
                                <View style={[styles.pickerAvatarWrap, (selectedGroupId === null || selectedGroupId === LS_ID) && styles.pickerAvatarWrapActive]}>
                                    <Globe size={24} color={(selectedGroupId === null || selectedGroupId === LS_ID) ? '#fff' : SOUP_COLORS.green} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[(selectedGroupId === null || selectedGroupId === LS_ID) ? styles.pickerLabelActive : styles.pickerLabel]} numberOfLines={1}>Language Soup</Text>
                                    <Text style={[styles.pickerItemHint, (selectedGroupId === null || selectedGroupId === LS_ID) && styles.pickerItemHintActive]}>all groups in one feed</Text>
                                </View>
                            </Pressable>
                            <View style={styles.pickerSectionRow}>
                                <View style={styles.pickerSectionAccent} />
                                <Text style={styles.pickerSectionLabel}>direct · 24/7</Text>
                            </View>
                            <Pressable style={({ pressed }) => [styles.pickerItemBig, pressed && { opacity: 0.9 }]} onPress={() => { try { haptics.light(); } catch (_) {} router.push('/your-groups'); setShowGroupPicker(false); }}>
                                <View style={styles.pickerAvatarWrap}>
                                    <Users size={22} color={SOUP_COLORS.turquoise} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.pickerLabel}>DMs</Text>
                                    <Text style={styles.pickerItemHint}>private chats</Text>
                                </View>
                            </Pressable>
                            <Pressable style={({ pressed }) => [styles.pickerItemBig, pressed && { opacity: 0.9 }]} onPress={() => { try { haptics.light(); } catch (_) {} router.push('/support-chat'); setShowGroupPicker(false); }}>
                                <View style={[styles.pickerAvatarWrap, styles.pickerAvatarWrapHighlight]}>
                                    <MessageCircle size={22} color={SOUP_COLORS.pink} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.pickerLabel}>chat with Noah</Text>
                                    <Text style={styles.pickerItemHint}>24/7 · founder</Text>
                                </View>
                            </Pressable>
                            <View style={styles.pickerSectionRow}>
                                <View style={styles.pickerSectionAccent} />
                                <Text style={styles.pickerSectionLabel}>my groups</Text>
                            </View>
                            {loadingGroups ? (
                                <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} style={{ marginVertical: 8 }} />
                            ) : (
                                chatGroups
                                    .filter((g) => g.id !== LS_ID)
                                    .map((g) => (
                                        <Pressable
                                            key={g.id}
                                            style={({ pressed }) => [styles.pickerItemBig, selectedGroupId === g.id && styles.pickerItemActive, pressed && { opacity: 0.9 }]}
                                            onPress={() => { try { haptics.light(); } catch (_) {} setSelectedGroupId(g.id); setShowGroupPicker(false); }}
                                        >
                                            {g.avatar_url ? (
                                                <Image source={getAvatarSource(g.avatar_url)} style={[styles.pickerGroupImg, selectedGroupId === g.id && styles.pickerGroupImgActive]} />
                                            ) : (
                                                <GroupAvatar language={g.language || g.name} size={42} />
                                            )}
                                            <Text style={[styles.pickerLabel, selectedGroupId === g.id && styles.pickerLabelActive]} numberOfLines={1}>{groupLabel(g)}</Text>
                                        </Pressable>
                                    ))
                            )}
                            <View style={styles.pickerDivider} />
                            <Pressable style={({ pressed }) => [styles.pickerJoinMore, pressed && { opacity: 0.9 }]} onPress={() => { try { haptics.light(); } catch (_) {} router.push('/browse-groups'); setShowGroupPicker(false); }}>
                                <PlusCircle size={18} color={SOUP_COLORS.turquoise} />
                                <Text style={styles.pickerJoinMoreText}>join more groups</Text>
                            </Pressable>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            <LevelsInfoSheet visible={showLevelsInfo} onClose={() => setShowLevelsInfo(false)} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    // Compact header: group chat is main; header and sidebar stay small
    homeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: 8,
        paddingTop: 8,
        marginBottom: 6,
        backgroundColor: SOUP_COLORS.turquoise,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    homeHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
        gap: 8,
    },
    homeHeaderAvatarCard: {
        width: 36,
        height: 36,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    homeHeaderAvatarImg: {
        width: 36,
        height: 36,
        borderRadius: 10,
    },
    homeHeaderAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    homeHeaderAvatarLetter: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    homeHeaderNameWrap: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    homeHeaderTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.2,
    },
    homeHeaderTagline: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
        marginTop: 1,
    },
    groupBanner: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: SOUP_COLORS.cream,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    groupBannerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupBannerLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        letterSpacing: 0.2,
    },
    groupBannerHint: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginTop: 4,
    },
    main: {
        flex: 1,
        minWidth: 0,
    },
    // Group picker modal (no left sidebar; main = full-width)
    pickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    pickerSheet: {
        backgroundColor: SOUP_COLORS.cream,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '80%',
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    pickerHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.2)',
        alignSelf: 'center',
        marginBottom: 16,
    },
    pickerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    pickerSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 16,
        lineHeight: 18,
    },
    pickerItemHint: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    pickerItemHintActive: {
        color: 'rgba(255,255,255,0.9)',
    },
    pickerScroll: {
        maxHeight: 400,
    },
    pickerItemBig: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 6,
    },
    pickerItemActive: {
        backgroundColor: SOUP_COLORS.turquoise,
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.pink,
    },
    pickerAvatarWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerAvatarWrapActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    pickerAvatarWrapHighlight: {
        backgroundColor: 'rgba(236,0,139,0.12)',
    },
    pickerGroupImg: {
        width: 42,
        height: 42,
        borderRadius: 12,
    },
    pickerGroupImgActive: {
        borderWidth: 2,
        borderColor: '#fff',
    },
    pickerSectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginTop: 8,
        gap: 8,
    },
    pickerSectionAccent: {
        width: 3,
        height: 14,
        borderRadius: 2,
        backgroundColor: SOUP_COLORS.turquoise,
    },
    pickerSectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pickerLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        flex: 1,
    },
    pickerLabelActive: {
        color: '#fff',
        fontWeight: '700',
    },
    pickerDivider: {
        height: 1,
        backgroundColor: 'rgba(0,173,239,0.15)',
        marginVertical: 10,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    pickerJoinMore: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginTop: 6,
        marginBottom: 16,
        backgroundColor: 'rgba(0,173,239,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(0,173,239,0.25)',
    },
    pickerJoinMoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.turquoise,
    },
});
