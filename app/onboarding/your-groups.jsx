import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { X, Plus } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingSwipeForward } from '../../components/OnboardingSwipeForward';
import { groupLanguageMatchesPicker } from '../../utils/languageGroupMatch';
import LanguageRequestModal from '../../components/LanguageRequestModal';
import { getAvatarSource, getDefaultSoupAvatarForId, sortAvatarUrlsRealFirst } from '../../utils/soupUtils';
import { getOrCreateGroupForLanguage } from '../../utils/getOrCreateGroupForLanguage';

export default function OnboardingYourGroupsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [pickedLanguages, setPickedLanguages] = useState([]);
    const [myGroups, setMyGroups] = useState([]);
    const [allGroups, setAllGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [leavingId, setLeavingId] = useState(null);
    const [joiningId, setJoiningId] = useState(null);
    const [search, setSearch] = useState('');
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [groupMemberAvatars, setGroupMemberAvatars] = useState({}); // groupId -> avatar_url[]
    const debounceRef = useRef(null);

    const myGroupIds = myGroups.map((g) => g.id);
    const otherGroups = allGroups.filter((g) => !myGroupIds.includes(g.id));
    const searchTerm = search.trim().toLowerCase();
    const filteredOther = searchTerm
        ? otherGroups.filter(
              (g) =>
                  (g.name || '').toLowerCase().includes(searchTerm) ||
                  (g.language || '').toLowerCase().includes(searchTerm)
          )
        : otherGroups;

    const languagesWithGroup = pickedLanguages.filter((pl) =>
        myGroups.some((g) => groupLanguageMatchesPicker(g.language || g.name, pl))
    );
    const languagesNoGroup = pickedLanguages.filter((pl) =>
        !myGroups.some((g) => groupLanguageMatchesPicker(g.language || g.name, pl))
    );

    const loadUserAndGroups = useCallback(async () => {
        if (!user?.id) return;
        try {
            const [membershipsRes, profileRes] = await Promise.all([
                supabase
                    .from('app_group_members')
                    .select('group_id, app_groups (id, name, language, level, member_count)')
                    .eq('user_id', user.id),
                supabase.from('app_users').select('learning_languages, fluent_languages').eq('id', user.id).maybeSingle(),
            ]);
            const list = (membershipsRes.data || []).map((m) => m.app_groups).filter(Boolean);
            setMyGroups(list);
            const langs = profileRes.data?.learning_languages || profileRes.data?.fluent_languages || [];
            setPickedLanguages(Array.isArray(langs) ? langs : []);
        } catch (err) {
            console.error('Error loading:', err);
        }
    }, [user?.id]);

    const loadAllGroups = useCallback(async (searchTerm = '') => {
        try {
            let query = supabase
                .from('app_groups')
                .select('*')
                .eq('is_visible', true)
                .order('member_count', { ascending: false })
                .limit(200);
            if (searchTerm) {
                const pattern = `%${searchTerm.replace(/%/g, '').replace(/_/g, '')}%`;
                query = query.or(`name.ilike.${pattern},language.ilike.${pattern}`);
            }
            const { data, error } = await query;
            if (error) throw error;
            setAllGroups(data || []);
        } catch (err) {
            console.error('Error loading groups:', err);
        }
    }, []);

    useEffect(() => {
        loadAllGroups();
    }, [loadAllGroups]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            loadUserAndGroups().finally(() => setLoading(false));
        }, [loadUserAndGroups])
    );

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!search.trim()) {
            loadAllGroups();
            return;
        }
        debounceRef.current = setTimeout(() => loadAllGroups(search), 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [search, loadAllGroups]);

    // Load member avatars for groups (show faces, not just counts)
    useEffect(() => {
        const groupIds = [...myGroupIds, ...otherGroups.map((g) => g.id)].filter(Boolean);
        if (groupIds.length === 0) return;
        let cancelled = false;
        (async () => {
            const { data: members } = await supabase
                .from('app_group_members')
                .select('group_id, user_id')
                .in('group_id', groupIds);
            if (cancelled || !members?.length) return;
            const byGroup = {};
            for (const row of members) {
                if (!byGroup[row.group_id]) byGroup[row.group_id] = [];
                if (byGroup[row.group_id].length < 6) byGroup[row.group_id].push(row.user_id);
            }
            const userIds = [...new Set(members.map((m) => m.user_id))];
            const { data: users } = await supabase
                .from('app_users')
                .select('id, avatar_url')
                .in('id', userIds);
            if (cancelled) return;
            const urlByUser = new Map((users || []).map((u) => [u.id, u.avatar_url || getDefaultSoupAvatarForId(u.id)]));
            const out = {};
            for (const [gid, uids] of Object.entries(byGroup)) {
                const urls = uids.map((uid) => urlByUser.get(uid)).filter(Boolean);
                out[gid] = sortAvatarUrlsRealFirst(urls);
            }
            setGroupMemberAvatars(out);
        })();
        return () => { cancelled = true; };
    }, [myGroups.length, allGroups.length]);

    const leaveGroup = async (groupId) => {
        if (!user?.id) return;
        setLeavingId(groupId);
        try {
            await supabase.from('app_group_members').delete().eq('user_id', user.id).eq('group_id', groupId);
            setMyGroups((prev) => prev.filter((g) => g.id !== groupId));
        } catch (err) {
            console.error('Error leaving group:', err);
            Alert.alert('Oops', "Couldn't leave that group. Try again.");
        } finally {
            setLeavingId(null);
        }
    };

    const joinGroup = async (group) => {
        if (!user?.id) return;
        setJoiningId(group.id);
        try {
            await supabase.from('app_group_members').upsert(
                { user_id: user.id, group_id: group.id, role: 'member' },
                { onConflict: 'user_id,group_id' }
            );
            setMyGroups((prev) => [...prev, group]);
        } catch (err) {
            console.error('Error joining group:', err);
            Alert.alert('Oops', "Couldn't join that group. Try again.");
        } finally {
            setJoiningId(null);
        }
    };

    const handleLeave = (group) => {
        Alert.alert(
            'Leave group?',
            `Leave "${group.name}"? You can join again anytime.`,
            [
                { text: 'cancel', style: 'cancel' },
                { text: 'leave', style: 'destructive', onPress: () => leaveGroup(group.id) },
            ]
        );
    };

    const handleContinue = () => {
        router.replace('/onboarding/tagline');
    };

    const renderAvatarStack = (groupId, size = 32) => {
        const urls = groupMemberAvatars[groupId] || [];
        if (urls.length === 0) return null;
        return (
            <View style={styles.avatarStack}>
                {urls.slice(0, 5).map((url, i) => {
                    const source = getAvatarSource(url);
                    return (
                        <View key={i} style={[styles.avatarStackItem, { width: size, height: size, borderRadius: size / 2, marginLeft: i === 0 ? 0 : -8 }]}>
                            {source ? (
                                <Image source={source} style={[styles.avatarImg, { width: size, height: size, borderRadius: size / 2 }]} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]} />
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    const handleSwipeForward = () => {
        handleContinue();
    };

    if (loading && myGroups.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <OnboardingSwipeForward onSwipeForward={handleSwipeForward} onSwipeBack={() => router.replace('/onboarding/conversational')}>
                <Pressable onPress={() => router.replace('/onboarding/conversational')} style={styles.backRow} hitSlop={12}>
                    <Text style={styles.backText}>←</Text>
                </Pressable>

                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
                    <Text style={styles.title}>your groups</Text>
                    <Text style={styles.subtitle}>we added you to some based on your languages. you can edit this list anytime</Text>
                </Animated.View>

                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.mainCard}>
                        <Text style={styles.eyebrow}>your groups ({myGroups.length})</Text>
                        {myGroups.length === 0 ? (
                            <Text style={styles.emptySuggestionText}>no groups yet. pick from more groups below.</Text>
                        ) : (
                            myGroups.map((group) => (
                                <View key={group.id} style={styles.groupRow}>
                                    {renderAvatarStack(group.id)}
                                    <View style={styles.groupInfo}>
                                        <View style={styles.groupNameRow}>
                                            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                                            {(group.member_count || 0) <= 1 && (
                                                <View style={styles.newTag}><Text style={styles.newTagText}>new</Text></View>
                                            )}
                                        </View>
                                        <Text style={styles.groupLang} numberOfLines={1}>{group.language || group.name}</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => handleLeave(group)}
                                        disabled={leavingId === group.id}
                                        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
                                    >
                                        {leavingId === group.id ? (
                                            <ActivityIndicator size="small" color={Colors.textLight} />
                                        ) : (
                                            <X size={18} color={Colors.textLight} />
                                        )}
                                    </Pressable>
                                </View>
                            ))
                        )}
                        {languagesNoGroup.length > 0 && (
                            <View style={styles.missingInline}>
                                <Text style={styles.missingLabel}>no group yet for:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
                                    {languagesNoGroup.map((lang) => (
                                        <View key={lang} style={styles.missingChip}>
                                            <Text style={styles.missingChipText} numberOfLines={1}>{lang.split(' (')[0].split('/')[0]}</Text>
                                        </View>
                                    ))}
                                </ScrollView>
                                <Pressable onPress={() => setShowRequestModal(true)} style={styles.requestLanguageBtn}>
                                    <Text style={styles.requestLanguageBtnText}>add a group for these</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    <View style={styles.addSection}>
                        <Text style={styles.sectionLabel}>more groups</Text>
                        <Text style={styles.reassureCopy}>don't worry if you're alone in a group. others will join and you can start speaking from the start and challenge friends.</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="search groups..."
                            placeholderTextColor="#999"
                            value={search}
                            onChangeText={setSearch}
                        />
                        {filteredOther.length === 0 ? (
                            <Text style={styles.hint}>{searchTerm ? 'no matches' : 'no more groups to show.'}</Text>
                        ) : (
                            filteredOther.map((group) => (
                                <Pressable
                                    key={group.id}
                                    onPress={() => joinGroup(group)}
                                    disabled={joiningId === group.id}
                                    style={({ pressed }) => [styles.groupRow, styles.addRow, pressed && { opacity: 0.9 }]}
                                >
                                    {renderAvatarStack(group.id)}
                                    <View style={styles.groupInfo}>
                                        <View style={styles.groupNameRow}>
                                            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
                                            {(group.member_count || 0) <= 1 && (
                                                <View style={styles.newTag}><Text style={styles.newTagText}>new</Text></View>
                                            )}
                                        </View>
                                        <Text style={styles.groupLang} numberOfLines={1}>{group.language || group.name}</Text>
                                    </View>
                                    {joiningId === group.id ? (
                                        <ActivityIndicator size="small" color={Colors.primary} style={styles.iconBtn} />
                                    ) : (
                                        <Plus size={22} color={Colors.primary} style={styles.iconBtn} />
                                    )}
                                </Pressable>
                            ))
                        )}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Pressable onPress={handleContinue} style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.9 }]}>
                        <Text style={styles.continueButtonText}>→</Text>
                    </Pressable>
                </View>

            <LanguageRequestModal
                visible={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                prefillText={languagesNoGroup.length > 0 ? languagesNoGroup.map((l) => l.split(' (')[0].split('/')[0]).join(', ') : ''}
                onSubmit={async (requestText) => {
                    if (!user?.id || !requestText?.trim()) return;
                    try {
                        const languages = requestText.split(',').map((s) => s.trim()).filter(Boolean);
                        for (const lang of languages) {
                            await getOrCreateGroupForLanguage(supabase, user.id, lang);
                        }
                        const rows = languages.map((language) => ({
                            user_id: user.id,
                            language,
                            status: 'pending',
                        }));
                        await supabase.from('app_language_requests').insert(rows);
                        await loadUserAndGroups();
                        setShowRequestModal(false);
                        Alert.alert('you\'re in!', languages.length > 1 ? `we made groups for ${languages.length} languages and added you. others will join as they sign up and you can start speaking from the start.` : "we made a group for that and added you. don't worry if you're alone for now. others will join and you can start speaking.");
                    } catch (e) {
                        console.error(e);
                        Alert.alert('oops', "couldn't submit. try again.");
                    }
                }}
            />
            </OnboardingSwipeForward>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backRow: {
        paddingHorizontal: 20,
        paddingTop: 6,
        paddingBottom: 2,
    },
    backText: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textLight,
        lineHeight: 20,
    },
    groupNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    newTag: {
        backgroundColor: Colors.primary + '30',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    newTagText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
        textTransform: 'lowercase',
    },
    reassureCopy: {
        fontSize: 13,
        color: Colors.textLight,
        lineHeight: 18,
        marginBottom: 12,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    mainCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    eyebrow: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textLight,
        marginBottom: 6,
        textTransform: 'lowercase',
    },
    chipScroll: {
        marginHorizontal: -4,
        marginBottom: 12,
    },
    chipScrollContent: {
        flexDirection: 'row',
        gap: 8,
        paddingVertical: 2,
    },
    langChip: {
        backgroundColor: Colors.primary + '18',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    langChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
        maxWidth: 100,
    },
    emptySuggestionText: {
        fontSize: 14,
        color: Colors.textLight,
        lineHeight: 20,
        marginTop: 4,
    },
    missingInline: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: Colors.primary + '25',
    },
    missingLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textLight,
        marginBottom: 6,
        textTransform: 'lowercase',
    },
    missingChip: {
        backgroundColor: '#fff',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.primary + '50',
    },
    missingChipText: {
        fontSize: 13,
        color: Colors.textLight,
        maxWidth: 90,
    },
    missingHint: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 8,
        lineHeight: 16,
    },
    requestLanguageBtn: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: Colors.primary + '25',
        alignSelf: 'flex-start',
    },
    requestLanguageBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    addSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 10,
    },
    searchInput: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: Colors.text,
        marginBottom: 10,
    },
    hint: {
        fontSize: 14,
        color: Colors.textLight,
        paddingVertical: 8,
    },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: 12,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },
    addRow: {
        borderColor: Colors.primary + '40',
        borderStyle: 'dashed',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarStackItem: {
        borderWidth: 2,
        borderColor: '#fff',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        backgroundColor: Colors.primary + '30',
    },
    groupInfo: {
        flex: 1,
        minWidth: 0,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    groupLang: {
        fontSize: 13,
        color: Colors.textLight,
        marginTop: 2,
    },
    iconBtn: {
        padding: 6,
        marginLeft: 6,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: Colors.background,
    },
    continueButton: {
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
