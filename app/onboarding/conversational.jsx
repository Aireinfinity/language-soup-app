import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingSwipeForward } from '../../components/OnboardingSwipeForward';
import { groupLanguageMatchesPicker } from '../../utils/languageGroupMatch';
import { haptics } from '../../utils/haptics';
import { getAvatarSource, getDefaultSoupAvatarForId, sortAvatarUrlsRealFirst } from '../../utils/soupUtils';

// Full list for reference
const _ALL = [
    'English', 'Spanish (Español)', 'French (Français)', 'German (Deutsch)', 'Italian (Italiano)',
    'Portuguese (Português)', 'Russian (Русский)', 'Chinese/Mandarin (中文)', 'Japanese (日本語)',
    'Korean (한국어)', 'Arabic (العربية)', 'Hindi (हिन्दी)', 'Bengali (বাংলা)', 'Urdu (اردو)',
    'Turkish (Türkçe)', 'Polish (Polski)', 'Dutch (Nederlands)', 'Swedish (Svenska)',
    'Danish (Dansk)', 'Norwegian (Norsk)', 'Finnish (Suomi)', 'Greek (Ελληνικά)', 'Czech (Čeština)',
    'Romanian (Română)', 'Hungarian (Magyar)', 'Thai (ไทย)', 'Vietnamese (Tiếng Việt)',
    'Indonesian (Bahasa Indonesia)', 'Malay (Bahasa Melayu)', 'Tagalog (Filipino)', 'Hebrew (עברית)',
    'Persian/Farsi (فارسی)', 'Swahili (Kiswahili)', 'Amharic (አማርኛ)', 'Zulu (isiZulu)',
    'Xhosa (isiXhosa)', 'Afrikaans', 'Catalan (Català)', 'Basque (Euskara)', 'Welsh (Cymraeg)',
    'Irish (Gaeilge)', 'Scottish Gaelic (Gàidhlig)', 'Icelandic (Íslenska)',
    'Yoruba (Èdè Yorùbá)', 'Igbo (Asụsụ Igbo)', 'Hausa', 'Somali (Soomaali)', 'Oromo (Afaan Oromoo)',
    'Tigrinya (ትግርኛ)', 'Shona (chiShona)', 'Sesotho', 'Kinyarwanda (Ikinyarwanda)',
    'Luganda', 'Wolof', 'Bambara', 'Fulani (Fulfulde)', 'Akan', 'Twi', 'Ewe', 'Fon', 'Lingala', 'Sango',
    'Serbian (Српски)', 'Croatian (Hrvatski)', 'Bosnian (Bosanski)', 'Slovenian (Slovenščina)',
    'Slovak (Slovenčina)', 'Bulgarian (Български)', 'Albanian (Shqip)', 'Macedonian (Македонски)',
    'Ukrainian (Українська)', 'Belarusian (Беларуская)', 'Lithuanian (Lietuvių)', 'Latvian (Latviešu)',
    'Estonian (Eesti)', 'Georgian (ქართული)', 'Armenian (Հայերեն)', 'Azeri (Azərbaycan)',
    'Kazakh (Қазақ)', 'Uzbek (Oʻzbek)', 'Tajik (Тоҷикӣ)', 'Turkmen (Türkmen)', 'Kyrgyz (Кыргызча)',
    'Mongolian (Монгол)', 'Tibetan (བོད་ཡིག)', 'Burmese (မြန်မာ)', 'Lao (ລາວ)',
    'Khmer (ភាសាខ្មែរ)', 'Sinhala (සිංහල)', 'Tamil (தமிழ்)', 'Telugu (తెలుగు)', 'Kannada (ಕನ್ನಡ)',
    'Malayalam (മലയാളം)', 'Gujarati (ગુજરાતી)', 'Punjabi (ਪੰਜਾਬੀ)', 'Marathi (मराठी)',
    'Nepali (नेपाली)', 'Pashto (پښتو)', 'Kurdish (Kurdî)', 'Dari (دری)', 'Quechua (Runasimi)',
    'Aymara', 'Guarani (Avañe\'ẽ)', 'Nahuatl', 'Maya (Mayat\'an)',
    'Navajo (Diné bizaad)', 'Cherokee (ᏣᎳᎩ)', 'Cree', 'Inuktitut (ᐃᓄᒃᑎᑐᑦ)', 'Hawaiian (ʻŌlelo Hawaiʻi)',
    'Maori (Te Reo Māori)', 'Samoan (Gagana Samoa)', 'Tongan (lea faka-Tonga)', 'Fijian (Na vosa vaka-Viti)',
    'Javanese (Basa Jawa)', 'Sundanese (Basa Sunda)', 'Balinese (Basa Bali)', 'Cebuano (Binisaya)',
    'Ilocano', 'Hiligaynon', 'Waray', 'Kapampangan',
    'Esperanto', 'Latin (Latina)', 'Sanskrit (संस्कृतम्)', 'Ancient Greek (Ἑλληνική)', 'Old Norse',
    'Yiddish (ייִדיש)', 'Ladino', 'Maltese (Malti)',
];
// Most to least popular (learners / we have groups); rest of _ALL appended
const POPULAR_FIRST = [
    'Spanish (Español)', 'French (Français)', 'German (Deutsch)', 'Italian (Italiano)', 'Portuguese (Português)',
    'English', 'Japanese (日本語)', 'Korean (한국어)', 'Chinese/Mandarin (中文)', 'Russian (Русский)', 'Arabic (العربية)',
    'Hindi (हिन्दी)', 'Turkish (Türkçe)', 'Dutch (Nederlands)', 'Swedish (Svenska)', 'Polish (Polski)',
    'Greek (Ελληνικά)', 'Romanian (Română)', 'Hebrew (עברית)', 'Thai (ไทย)', 'Vietnamese (Tiếng Việt)',
    'Indonesian (Bahasa Indonesia)', 'Persian/Farsi (فارسی)', 'Danish (Dansk)', 'Norwegian (Norsk)', 'Finnish (Suomi)',
];
const REST = _ALL.filter((l) => !POPULAR_FIRST.includes(l));
const LANGUAGES_BY_POPULARITY = [...POPULAR_FIRST, ...REST];

// Show full name instead of acronyms (e.g. "French Sign Language" not "LSF")
function getDisplayName(lang) {
    const beforeParen = lang.split(' (')[0].trim();
    const inParens = lang.match(/\(([^)]+)\)/)?.[1]?.trim();
    const looksLikeAcronym = /^[A-Z]{2,5}$/.test(beforeParen);
    if (looksLikeAcronym && inParens) return inParens;
    return beforeParen.split('/')[0].trim();
}

export default function ConversationalScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [languageCounts, setLanguageCounts] = useState({});
    const [languageAvatars, setLanguageAvatars] = useState({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: groups } = await supabase
                .from('app_groups')
                .select('id, name, language, member_count')
                .eq('is_visible', true);
            const filtered = (groups || []).filter(
                (g) => !['test', 'tester', 'support'].some((w) => (g.name || '').toLowerCase().includes(w))
            );
            const counts = {};
            const bestGroupId = {};
            for (const pickerLang of LANGUAGES_BY_POPULARITY) {
                for (const g of filtered) {
                    if (!groupLanguageMatchesPicker(g.language || g.name, pickerLang)) continue;
                    const c = g.member_count || 0;
                    counts[pickerLang] = (counts[pickerLang] || 0) + c;
                    if (!bestGroupId[pickerLang] || c > (filtered.find((x) => x.id === bestGroupId[pickerLang])?.member_count || 0)) {
                        bestGroupId[pickerLang] = g.id;
                    }
                }
            }
            if (cancelled) return;
            setLanguageCounts(counts);
            const groupIds = [...new Set(Object.values(bestGroupId).filter(Boolean))].slice(0, 25);
            if (groupIds.length === 0) return;
            const { data: members } = await supabase
                .from('app_group_members')
                .select('group_id, user_id')
                .in('group_id', groupIds);
            if (cancelled || !members?.length) return;
            const byGroup = {};
            for (const m of members) {
                if (!byGroup[m.group_id]) byGroup[m.group_id] = [];
                if (byGroup[m.group_id].length < 5) byGroup[m.group_id].push(m.user_id);
            }
            const userIds = [...new Set(members.map((m) => m.user_id))];
            const { data: users } = await supabase.from('app_users').select('id, avatar_url').in('id', userIds);
            if (cancelled) return;
            const urlByUser = new Map((users || []).map((u) => [u.id, u.avatar_url || getDefaultSoupAvatarForId(u.id)]));
            const avatarsByGroup = {};
            for (const [gid, uids] of Object.entries(byGroup)) {
                avatarsByGroup[gid] = uids.map((uid) => urlByUser.get(uid)).filter(Boolean);
            }
            const avatarsByLang = {};
            for (const [lang, gid] of Object.entries(bestGroupId)) {
                if (avatarsByGroup[gid]) avatarsByLang[lang] = sortAvatarUrlsRealFirst(avatarsByGroup[gid]);
            }
            setLanguageAvatars(avatarsByLang);
        })();
        return () => { cancelled = true; };
    }, []);

    const searchLower = search.trim().toLowerCase();
    const listSource = useMemo(() => {
        if (searchLower) {
            return LANGUAGES_BY_POPULARITY.filter((lang) => lang.toLowerCase().includes(searchLower));
        }
        return [...LANGUAGES_BY_POPULARITY].sort((a, b) => (languageCounts[b] || 0) - (languageCounts[a] || 0));
    }, [searchLower, languageCounts]);

    const toggleLanguage = (lang) => {
        try { haptics.light(); } catch (_) {}
        if (selectedLanguages.includes(lang)) {
            setSelectedLanguages((prev) => prev.filter((l) => l !== lang));
        } else {
            setSelectedLanguages((prev) => [...prev, lang]);
            if (searchLower) setSearch('');
        }
    };

    const handleContinue = async () => {
        if (selectedLanguages.length === 0) return;

        setSaving(true);
        try {
            await supabase
                .from('app_users')
                .update({
                    fluent_languages: selectedLanguages,
                    learning_languages: selectedLanguages,
                })
                .eq('id', user.id);

            // Fetch all visible groups and match in JS (DB language strings can vary).
            const { data: allVisibleGroups } = await supabase
                .from('app_groups')
                .select('id, language, name')
                .eq('is_visible', true);
            const candidates = (allVisibleGroups || []).filter(
                (g) => !['test', 'tester', 'support'].some((word) => (g.name || '').toLowerCase().includes(word))
            );

            const matchingGroups = candidates.filter((g) =>
                selectedLanguages.some((sel) => groupLanguageMatchesPicker(g.language || g.name, sel))
            );
            const matchedLanguages = new Set(matchingGroups.map((g) => g.language || g.name));

            if (matchingGroups.length > 0) {
                const memberships = matchingGroups.map((g) => ({
                    user_id: user.id,
                    group_id: g.id,
                    role: 'member',
                }));
                await supabase
                    .from('app_group_members')
                    .upsert(memberships, { onConflict: 'user_id,group_id' });
            }

            const noGroupFor = selectedLanguages.filter((sel) =>
                ![...matchedLanguages].some((gl) => groupLanguageMatchesPicker(gl, sel))
            );
            if (noGroupFor.length > 0) {
                const displayNames = noGroupFor.map((l) => l.split(' (')[0].split('/')[0]);
                const names = displayNames.length <= 4
                    ? displayNames.join(', ')
                    : `${displayNames.slice(0, 4).join(', ')} and ${displayNames.length - 4} more`;
                Alert.alert(
                    "we don't have those yet",
                    `No group for ${names} right now. You can request them on the next screen.`,
                    [{ text: 'ok' }]
                );
            }

            router.push('/onboarding/your-groups');
        } catch (error) {
            console.error('Error saving languages:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSwipeForward = () => {
        if (selectedLanguages.length > 0 && !saving) handleContinue();
    };

    const renderAvatarStack = (lang, size = 28) => {
        const urls = languageAvatars[lang] || [];
        if (urls.length === 0) return null;
        return (
            <View style={styles.avatarStack}>
                {urls.slice(0, 4).map((url, i) => {
                    const source = getAvatarSource(url);
                    return (
                        <View key={i} style={[styles.avatarStackItem, { width: size, height: size, borderRadius: size / 2, marginLeft: i === 0 ? 0 : -6 }]}>
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

    return (
        <SafeAreaView style={styles.container}>
            <OnboardingSwipeForward onSwipeForward={handleSwipeForward}>
            <Pressable onPress={() => router.replace('/login')} style={styles.backRow} hitSlop={12}>
                <Text style={styles.backText}>←</Text>
            </Pressable>
            <View style={styles.header}>
                <Text style={styles.headline}>add your languages</Text>
                <Text style={styles.subline}>tap to add the ones you want to practice</Text>
            </View>
            <View style={styles.content}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="…"
                    placeholderTextColor={Colors.textLight}
                    value={search}
                    onChangeText={setSearch}
                />

                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                    {listSource.map((lang) => {
                        const selected = selectedLanguages.includes(lang);
                        const displayName = getDisplayName(lang);
                        const count = languageCounts[lang];
                        return (
                            <Pressable
                                key={lang}
                                style={({ pressed }) => [
                                    styles.row,
                                    selected && styles.rowSelected,
                                    pressed && styles.rowPressed,
                                ]}
                                onPress={() => toggleLanguage(lang)}
                            >
                                {renderAvatarStack(lang)}
                                <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>
                                    {displayName}
                                </Text>
                                {count != null && count > 0 && (
                                    <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
                                        <Text style={[styles.countText, selected && styles.countTextSelected]}>{count}</Text>
                                    </View>
                                )}
                                {selected && <Check size={20} color={Colors.primary} strokeWidth={2.5} />}
                            </Pressable>
                        );
                    })}
                    {listSource.length === 0 && <Text style={styles.emptySearch}>—</Text>}
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <Pressable
                    onPress={handleContinue}
                    style={[styles.button, selectedLanguages.length === 0 && styles.buttonDisabled]}
                    disabled={saving || selectedLanguages.length === 0}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>{selectedLanguages.length > 0 ? `${selectedLanguages.length} →` : 'continue'}</Text>
                    )}
                </Pressable>

            </View>
            </OnboardingSwipeForward>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 8,
    },
    headline: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    subline: {
        fontSize: 14,
        color: Colors.textLight,
        marginTop: 4,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    searchInput: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: Colors.text,
        marginBottom: 10,
    },
    list: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginHorizontal: -4,
        borderRadius: 14,
        marginBottom: 4,
    },
    rowSelected: {
        backgroundColor: Colors.primary + '18',
    },
    rowPressed: {
        opacity: 0.7,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarStackItem: {
        borderWidth: 2,
        borderColor: Colors.background,
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        backgroundColor: Colors.primary + '30',
    },
    rowText: {
        fontSize: 16,
        color: Colors.text,
        flex: 1,
        marginRight: 8,
    },
    rowTextSelected: {
        fontWeight: '700',
        color: Colors.primary,
    },
    countBadge: {
        backgroundColor: Colors.accent + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        marginRight: 8,
    },
    countBadgeSelected: {
        backgroundColor: Colors.accent + '35',
    },
    countText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.accent,
    },
    countTextSelected: {
        color: Colors.accent,
    },
    emptySearch: {
        fontSize: 14,
        color: Colors.textLight,
        paddingVertical: 24,
        textAlign: 'center',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.4,
        shadowOpacity: 0,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    skipButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 16,
        color: Colors.textLight,
    },
    backRow: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backText: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
    },
});
