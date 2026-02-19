/**
 * Add a language (and group) from the Language Soup flow.
 * Same logic as adding a new group: getOrCreateGroupForLanguage + add to profile learning_languages.
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
    Alert,
    TextInput,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getOrCreateGroupForLanguage } from '../utils/getOrCreateGroupForLanguage';
import { SUPPORTED_LANGUAGES } from '../constants/SupportedLanguages';
import { haptics } from '../utils/haptics';
import { getAvatarSource, sortAvatarUrlsRealFirst } from '../utils/soupUtils';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

export default function AddLanguage() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // language string in progress
    const [myLanguages, setMyLanguages] = useState([]); // from groups + learning_languages
    const [search, setSearch] = useState('');
    const [languageCounts, setLanguageCounts] = useState({}); // base -> member_count
    const [languageAvatars, setLanguageAvatars] = useState({}); // base -> avatar_url[]

    useEffect(() => {
        loadMyLanguages();
        loadLanguageCounts();
    }, [user?.id]);

    const loadMyLanguages = async () => {
        if (!user?.id) return;
        try {
            const { data: profile } = await supabase
                .from('app_users')
                .select('learning_languages')
                .eq('id', user.id)
                .single();
            const learning = profile?.learning_languages || [];
            const { data: memberships } = await supabase
                .from('app_group_members')
                .select('app_groups(language)')
                .eq('user_id', user.id);
            const fromGroups = (memberships || [])
                .map((m) => m.app_groups?.language)
                .filter(Boolean);
            setMyLanguages([...new Set([...learning, ...fromGroups])]);
        } catch (e) {
            console.warn('AddLanguage loadMyLanguages:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadLanguageCounts = async () => {
        try {
            const { data: groups } = await supabase
                .from('app_groups')
                .select('id, language, member_count')
                .eq('is_visible', true);
            const counts = {};
            const baseToGroupId = {}; // base -> group id with max member_count for that base
            (groups || []).forEach((g) => {
                const lang = (g.language || '').trim();
                if (!lang) return;
                const base = lang.split(/[\-\–\(]/)[0].trim().toLowerCase();
                if (!counts[base]) counts[base] = 0;
                counts[base] += g.member_count || 0;
                const current = baseToGroupId[base];
                if (!current || (g.member_count || 0) > (current.count || 0)) {
                    baseToGroupId[base] = { id: g.id, count: g.member_count || 0 };
                }
            });
            setLanguageCounts(counts);

            const groupIds = Object.values(baseToGroupId).map((x) => x.id).filter(Boolean);
            if (groupIds.length > 0) {
                const { data: members } = await supabase
                    .from('app_group_members')
                    .select('group_id, user_id')
                    .in('group_id', groupIds);
                const userIds = [...new Set((members || []).map((m) => m.user_id))];
                if (userIds.length > 0) {
                    const { data: users } = await supabase
                        .from('app_users')
                        .select('id, avatar_url')
                        .in('id', userIds);
                    const urlById = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.avatar_url }), {});
                    const baseToGroupIdMap = {};
                    Object.keys(baseToGroupId).forEach((b) => { baseToGroupIdMap[baseToGroupId[b].id] = b; });
                    const byBase = {};
                    (members || []).forEach((m) => {
                        const base = baseToGroupIdMap[m.group_id];
                        if (!base) return;
                        if (!byBase[base]) byBase[base] = [];
                        const url = urlById[m.user_id];
                        if (url && byBase[base].length < 5) byBase[base].push(url);
                    });
                    Object.keys(byBase).forEach((b) => {
                        byBase[b] = sortAvatarUrlsRealFirst(byBase[b]).slice(0, 5);
                    });
                    setLanguageAvatars(byBase);
                }
            }
        } catch (e) {
            console.warn('AddLanguage loadLanguageCounts:', e);
        }
    };

    const getCountForLanguage = (pickerLanguage) => {
        const base = (pickerLanguage || '').split(/[\-\–\/\(]/)[0].trim().toLowerCase();
        return languageCounts[base] ?? 0;
    };

    const filtered = search.trim()
        ? SUPPORTED_LANGUAGES.filter((l) =>
            l.toLowerCase().includes(search.trim().toLowerCase())
        )
        : SUPPORTED_LANGUAGES;

    const sorted = [...filtered].sort((a, b) => getCountForLanguage(b) - getCountForLanguage(a));

    const handleAdd = async (language) => {
        if (!user?.id || actionLoading) return;
        try {
            haptics.light();
            setActionLoading(language);
            const group = await getOrCreateGroupForLanguage(supabase, user.id, language);
            if (!group) {
                Alert.alert('oops', "couldn't add that. try again.");
                return;
            }
            const { data: profile } = await supabase
                .from('app_users')
                .select('learning_languages')
                .eq('id', user.id)
                .single();
            const current = profile?.learning_languages || [];
            const next = current.some((l) => (l || '').toLowerCase() === (language || '').toLowerCase())
                ? current
                : [...current, language];
            await supabase
                .from('app_users')
                .update({ learning_languages: next })
                .eq('id', user.id);
            setMyLanguages((prev) => (prev.includes(language) ? prev : [...prev, language]));
            Alert.alert(
                "you're in!",
                `we added you to ${group.name || language}. you'll see it in your groups.`,
                [{ text: 'ok', onPress: () => router.back() }]
            );
        } catch (e) {
            console.error('AddLanguage handleAdd:', e);
            Alert.alert('oops', "couldn't add that. try again.");
        } finally {
            setActionLoading(null);
        }
    };

    if (!user?.id) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Text style={styles.placeholder}>sign in to add languages</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable
                    style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
                    onPress={() => { try { haptics.light(); } catch (_) {} router.back(); }}
                >
                    <ArrowLeft size={24} color={SOUP_COLORS.text} />
                </Pressable>
                <Text style={styles.title}>add a language</Text>
            </View>
            <Text style={styles.subtitle}>pick one to join or create a group. we'll add it to your profile.</Text>
            <TextInput
                style={styles.search}
                placeholder="search languages…"
                placeholderTextColor={SOUP_COLORS.subtext}
                value={search}
                onChangeText={setSearch}
            />
            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} />
                </View>
            ) : (
                <FlatList
                    data={sorted}
                    keyExtractor={(item) => item}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isMine = myLanguages.some(
                            (l) => (l || '').toLowerCase() === (item || '').toLowerCase()
                        );
                        const busy = actionLoading === item;
                        const count = getCountForLanguage(item);
                        const base = (item || '').split(/[\-\–\/\(]/)[0].trim().toLowerCase();
                        const avatarUrls = languageAvatars[base] || [];
                        return (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.row,
                                    pressed && { opacity: 0.9 },
                                    isMine && styles.rowMine,
                                ]}
                                onPress={() => !isMine && !busy && handleAdd(item)}
                                disabled={isMine || busy}
                            >
                                <View style={styles.rowLeft}>
                                    {avatarUrls.length > 0 && (
                                        <View style={styles.avatarRow}>
                                            {avatarUrls.slice(0, 5).map((url, i) => {
                                                const source = getAvatarSource(url);
                                                return source ? (
                                                    <Image key={i} source={source} style={styles.avatarDot} />
                                                ) : (
                                                    <View key={i} style={[styles.avatarDot, styles.avatarDotPlaceholder]}>
                                                        <Text style={styles.avatarDotLetter}>?</Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    )}
                                    <Text style={[styles.rowText, isMine && styles.rowTextMine]} numberOfLines={1}>
                                        {item}
                                    </Text>
                                    {count > 0 && (
                                        <Text style={styles.rowCount}>{count} {count === 1 ? 'person' : 'people'}</Text>
                                    )}
                                </View>
                                {busy ? (
                                    <ActivityIndicator size="small" color={SOUP_COLORS.turquoise} />
                                ) : isMine ? (
                                    <Text style={styles.rowBadge}>in soup</Text>
                                ) : (
                                    <Text style={styles.rowAdd}>+ add</Text>
                                )}
                            </Pressable>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    placeholder: {
        fontSize: 16,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        marginTop: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 12,
    },
    backBtn: { padding: 8 },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    subtitle: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    search: {
        height: 44,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 14,
        backgroundColor: '#fff',
        borderRadius: 12,
        fontSize: 16,
        color: SOUP_COLORS.text,
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: { flex: 1 },
    listContent: { paddingBottom: 24 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    rowLeft: { flex: 1, minWidth: 0 },
    avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    avatarDot: { width: 24, height: 24, borderRadius: 12, marginRight: -6, borderWidth: 2, borderColor: SOUP_COLORS.cream },
    avatarDotPlaceholder: { backgroundColor: SOUP_COLORS.turquoise, justifyContent: 'center', alignItems: 'center' },
    avatarDotLetter: { fontSize: 10, fontWeight: '800', color: '#fff' },
    rowCount: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    rowMine: { backgroundColor: 'rgba(0,173,239,0.06)' },
    rowText: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        flex: 1,
    },
    rowTextMine: { color: SOUP_COLORS.subtext },
    rowBadge: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.turquoise,
    },
    rowAdd: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.turquoise,
    },
});
