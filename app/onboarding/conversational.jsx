import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ALL_LANGUAGES = [
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
    'ASL (American Sign Language)', 'BSL (British Sign Language)', 'Auslan (Australian Sign Language)',
    'LSF (French Sign Language)', 'DGS (German Sign Language)', 'JSL (Japanese Sign Language)',
    'KSL (Korean Sign Language)', 'CSL (Chinese Sign Language)', 'ISL (Indian Sign Language)',
    'LSE (Spanish Sign Language)', 'LIS (Italian Sign Language)', 'International Sign',
];

export default function ConversationalScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredLanguages = ALL_LANGUAGES.filter(lang =>
        !selectedLanguages.includes(lang) &&
        lang.toLowerCase().includes(search.toLowerCase())
    );

    const toggleLanguage = (lang) => {
        if (selectedLanguages.includes(lang)) {
            setSelectedLanguages(prev => prev.filter(l => l !== lang));
        } else {
            setSelectedLanguages(prev => [...prev, lang]);
            setSearch(''); // Clear search after selecting
        }
    };

    const handleContinue = async () => {
        if (selectedLanguages.length === 0) return;

        setSaving(true);
        try {
            await supabase
                .from('app_users')
                .update({ fluent_languages: selectedLanguages })
                .eq('id', user.id);

            router.push('/onboarding/learning');
        } catch (error) {
            console.error('Error saving languages:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        router.push('/onboarding/learning');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
                <Text style={styles.title}>what languages can you chat in? 💬</Text>
                <Text style={styles.subtitle}>pick all that you're comfortable with</Text>
            </Animated.View>

            <View style={styles.content}>
                {/* Selected Languages */}
                {selectedLanguages.length > 0 && (
                    <View style={styles.selectedContainer}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.selectedScroll}
                        >
                            {selectedLanguages.map(lang => (
                                <Pressable
                                    key={lang}
                                    style={styles.selectedChip}
                                    onPress={() => toggleLanguage(lang)}
                                >
                                    <Text style={styles.selectedChipText}>{lang} ✕</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Search */}
                <TextInput
                    style={styles.searchInput}
                    placeholder="search languages..."
                    placeholderTextColor="#999"
                    value={search}
                    onChangeText={setSearch}
                />

                {/* Available Languages - Optimized List (No individual entering animations) */}
                <ScrollView style={styles.languageList} contentContainerStyle={styles.languageListContent}>
                    {(search ? filteredLanguages : ALL_LANGUAGES.filter(l => !selectedLanguages.includes(l)))
                        .slice(0, 50) // Limit initial render if needed, but removing animation helps most
                        .map((lang, index) => (
                            <Pressable
                                key={lang}
                                style={styles.languageChip}
                                onPress={() => toggleLanguage(lang)}
                            >
                                <Text style={styles.languageChipText}>{lang}</Text>
                            </Pressable>
                        ))}
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
                        <Text style={styles.buttonText}>continue ({selectedLanguages.length})</Text>
                    )}
                </Pressable>

                <Pressable onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>skip for now</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textLight,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    selectedContainer: {
        marginBottom: 16,
    },
    selectedScroll: {
        gap: 8,
    },
    selectedChip: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    selectedChipText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    searchInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.text,
        marginBottom: 16,
    },
    languageList: {
        flex: 1,
    },
    languageListContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    languageChip: {
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    languageChipText: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
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
});
