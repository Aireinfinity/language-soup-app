/**
 * Feed layout: header (list icon = group picker, profile, levels) + main (group chat or DMs list).
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, ScrollView, Modal, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MessageCircle, Users, PlusCircle, Menu } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFeed } from '../contexts/FeedContext';
import { supabase } from '../lib/supabase';
import { track, AnalyticsEvents } from '../lib/analytics';
import { getAvatarSource } from '../utils/soupUtils';
import { haptics } from '../utils/haptics';
import { computeLevelsFromStats } from '../utils/levelHelpers';
import GroupAvatar from './GroupAvatar';
import { LevelsInfoSheet } from './LevelsInfoSheet';
import { LevelsPill } from './LevelsPill';
import WhatsNewSheet from './WhatsNewSheet';
import { SecurityBanner } from './SecurityBanner';
import { shouldShowWhatsNew, markWhatsNewAsSeen } from '../utils/versionTracking';

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
    const { selectedGroupId, setSelectedGroupId, LANGUAGE_SOUP_GROUP_ID: LS_ID, DM_LIST_ID } = useFeed();
    const [userDisplayName, setUserDisplayName] = useState('');
    const [userTagline, setUserTagline] = useState('');
    const [userAvatarUrl, setUserAvatarUrl] = useState(null);
    const [chatGroups, setChatGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [showGroupPicker, setShowGroupPicker] = useState(false);
    const [showLevelsInfo, setShowLevelsInfo] = useState(false);
    const [showWhatsNew, setShowWhatsNew] = useState(false);
    const levels = useLevels(user?.id);

    // Show "what's new" once per app version when they enter the app
    useEffect(() => {
        if (!user?.id) return;
        let mounted = true;
        shouldShowWhatsNew().then((show) => {
            if (mounted && show) setShowWhatsNew(true);
        });
        return () => { mounted = false; };
    }, [user?.id]);

    const isLanguageSoup = selectedGroupId === null || selectedGroupId === LS_ID;
    const isDMs = selectedGroupId === DM_LIST_ID;
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
            // Rest = non-DM groups only (DMs are shown in DMs view, not in "my groups" picker list)
            const rest = list.filter((g) => g.id !== LS_ID && g.name !== 'DM');
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
    const drawerWidth = Math.min(Dimensions.get('window').width * 0.82, 320);
    const slideAnim = useRef(new Animated.Value(-320)).current;

    useEffect(() => {
        if (showGroupPicker) {
            slideAnim.setValue(-drawerWidth);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 12,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -drawerWidth,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [showGroupPicker, drawerWidth]);

    return (
        <View style={styles.container}>
            <View style={[styles.homeHeader, { paddingTop: insets.top + 6 }]}>
                <Pressable
                    style={({ pressed }) => [styles.headerListButton, pressed && { opacity: 0.85 }]}
                    onPress={() => { try { haptics.light(); } catch (_) {} loadGroups(); setShowGroupPicker(true); }}
                >
                    <Menu size={24} color="#fff" />
                </Pressable>
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
                <View style={styles.headerLevelsInline}>
                    <LevelsPill speakLevel={levels.speak} listenLevel={levels.listen} onPress={() => { try { haptics.light(); } catch (_) {} setShowLevelsInfo(true); }} compact />
                </View>
            </View>

            {isDMs && (
                <View style={styles.dmTabBar}>
                    <Text style={styles.dmTabBarText}>DMs</Text>
                </View>
            )}
            {currentGroup && !isLanguageSoup && !isDMs && (
                <View style={styles.groupInfoBar}>
                    <Text style={styles.groupInfoName} numberOfLines={1}>{currentGroup.name || currentGroup.language || 'Group'}</Text>
                    <Text style={styles.groupInfoCount}>{currentGroup.member_count ?? 0} members</Text>
                </View>
            )}

            <SecurityBanner />
            <View style={styles.main}>
                {children}
            </View>

            {/* Group picker: slides in from the left (burger on left) */}
            <Modal visible={showGroupPicker} transparent animationType="fade">
                <Pressable style={styles.pickerOverlayLeft} onPress={() => setShowGroupPicker(false)}>
                    <Animated.View style={[styles.pickerSheetLeft, { width: drawerWidth, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, transform: [{ translateX: slideAnim }] }]}>
                        <Text style={styles.pickerTitle}>pick your group</Text>
                        <Text style={styles.pickerSubtitle}>tap to switch. Language Soup = all groups in one.</Text>
                        <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                            <Pressable
                                style={({ pressed }) => [styles.pickerItemBig, (selectedGroupId === null || selectedGroupId === LS_ID) && styles.pickerItemActive, pressed && { opacity: 0.9 }]}
                                onPress={() => { try { haptics.light(); } catch (_) {} setSelectedGroupId(null); setShowGroupPicker(false); }}
                            >
                                <View style={[styles.pickerAvatarWrap, (selectedGroupId === null || selectedGroupId === LS_ID) && styles.pickerAvatarWrapActive]}>
                                    <Image source={require('../assets/images/logo.png')} style={styles.pickerSoupLogo} />
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
                            <Pressable
                                style={({ pressed }) => [styles.pickerItemBig, isDMs && styles.pickerItemActive, pressed && { opacity: 0.9 }]}
                                onPress={() => { try { haptics.light(); } catch (_) {} setSelectedGroupId(DM_LIST_ID); setShowGroupPicker(false); }}
                            >
                                <View style={[styles.pickerAvatarWrap, isDMs && styles.pickerAvatarWrapActive]}>
                                    <Users size={22} color={isDMs ? '#fff' : SOUP_COLORS.turquoise} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.pickerLabel, isDMs && styles.pickerLabelActive]} numberOfLines={1}>DMs</Text>
                                    <Text style={[styles.pickerItemHint, isDMs && styles.pickerItemHintActive]}>people you message</Text>
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
                                    .filter((g) => g.id !== LS_ID && g.name !== 'DM')
                                    .map((g) => (
                                        <Pressable
                                            key={g.id}
                                            style={({ pressed }) => [styles.pickerItemBig, selectedGroupId === g.id && styles.pickerItemActive, pressed && { opacity: 0.9 }]}
                                            onPress={() => {
                                                try { haptics.light(); } catch (_) {}
                                                track(AnalyticsEvents.GROUP_CHAT_OPEN, { group_id: g.id, group_name: g.name, language: g.language });
                                                setSelectedGroupId(g.id);
                                                setShowGroupPicker(false);
                                            }}
                                        >
                                            {g.avatar_url ? (
                                                <Image source={getAvatarSource(g.avatar_url)} style={[styles.pickerGroupImg, selectedGroupId === g.id && styles.pickerGroupImgActive]} />
                                            ) : (
                                                <GroupAvatar language={g.language || g.name} size={42} />
                                            )}
                                            <Text style={[styles.pickerLabel, selectedGroupId === g.id && styles.pickerLabelActive]} numberOfLines={1}>{(g.name || g.language || 'Group').trim()}</Text>
                                        </Pressable>
                                    ))
                            )}
                            <View style={styles.pickerDivider} />
                            <Pressable style={({ pressed }) => [styles.pickerJoinMore, pressed && { opacity: 0.9 }]} onPress={() => { try { haptics.light(); } catch (_) {} router.push('/add-language'); setShowGroupPicker(false); }}>
                                <PlusCircle size={18} color={SOUP_COLORS.turquoise} />
                                <Text style={styles.pickerJoinMoreText}>add a language</Text>
                            </Pressable>
                            <Pressable style={({ pressed }) => [styles.pickerJoinMore, pressed && { opacity: 0.9 }]} onPress={() => { try { haptics.light(); } catch (_) {} router.push('/browse-groups'); setShowGroupPicker(false); }}>
                                <PlusCircle size={18} color={SOUP_COLORS.turquoise} />
                                <Text style={styles.pickerJoinMoreText}>join more groups</Text>
                            </Pressable>
                        </ScrollView>
                    </Animated.View>
                </Pressable>
            </Modal>

            <LevelsInfoSheet visible={showLevelsInfo} onClose={() => setShowLevelsInfo(false)} speakLevel={levels.speak} listenLevel={levels.listen} />
            <WhatsNewSheet
                visible={showWhatsNew}
                onClose={() => {
                    markWhatsNewAsSeen();
                    setShowWhatsNew(false);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: SOUP_COLORS.cream,
    },
    homeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
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
    headerListButton: {
        padding: 10,
        marginRight: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    main: {
        flex: 1,
        minWidth: 0,
    },
    // Group picker: drawer from the left
    pickerOverlayLeft: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    pickerSheetLeft: {
        backgroundColor: SOUP_COLORS.cream,
        paddingHorizontal: 16,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        flex: 0,
    },
    groupInfoBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    dmTabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: SOUP_COLORS.turquoise,
    },
    dmTabBarText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.2,
    },
    groupInfoName: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        flex: 1,
    },
    groupInfoCount: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    headerLevelsInline: {
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    pickerSoupLogo: {
        width: 32,
        height: 32,
        borderRadius: 10,
        resizeMode: 'contain',
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
        flexGrow: 1,
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
