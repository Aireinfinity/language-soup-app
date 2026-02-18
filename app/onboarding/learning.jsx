import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingSwipeForward } from '../../components/OnboardingSwipeForward';
import { SUPPORTED_LANGUAGES } from '../../constants/SupportedLanguages';

export default function LearningScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [extraLanguages, setExtraLanguages] = useState([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data: groups } = await supabase.from('app_groups').select('language').eq('is_visible', true);
            if (cancelled || !groups?.length) return;
            const fromDb = [...new Set((groups || []).map(g => (g.language || '').trim()).filter(Boolean))];
            const missing = fromDb.filter(l => !SUPPORTED_LANGUAGES.some(b => b.toLowerCase().includes(l.toLowerCase()) || l.toLowerCase().includes(b.split(' (')[0].toLowerCase())));
            setExtraLanguages(missing);
        })();
        return () => { cancelled = true; };
    }, []);

    const ALL_LANGUAGES = useMemo(() => {
        const combined = [...SUPPORTED_LANGUAGES];
        for (const l of extraLanguages) {
            if (!combined.includes(l)) combined.push(l);
        }
        return combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    }, [extraLanguages]);

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
                .update({ learning_languages: selectedLanguages })
                .eq('id', user.id);

            router.push('/onboarding/tagline');
        } catch (error) {
            console.error('Error saving languages:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        router.push('/onboarding/tagline');
    };

    const handleSwipeForward = () => {
        if (selectedLanguages.length > 0 && !saving) handleContinue();
        else handleSkip();
    };

    return (
        <SafeAreaView style={styles.container}>
            <OnboardingSwipeForward onSwipeForward={handleSwipeForward}>
            <Pressable onPress={() => router.replace('/onboarding/conversational')} style={styles.backRow} hitSlop={12}>
                <Text style={styles.backText}>← back</Text>
            </Pressable>
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
                <Text style={styles.title}>which languages are you learning? 🌍</Text>
                <Text style={styles.subtitle}>we offer {ALL_LANGUAGES.length} languages. we'll match you to groups for these</Text>
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

                {/* Available Languages */}
                <ScrollView style={styles.languageList} contentContainerStyle={styles.languageListContent}>
                    {(search ? filteredLanguages : ALL_LANGUAGES.filter(l => !selectedLanguages.includes(l)))
                        .slice(0, 30)
                        .map((lang, index) => (
                            <Animated.View key={lang} entering={FadeInDown.delay(index * 30).springify()}>
                                <Pressable
                                    style={styles.languageChip}
                                    onPress={() => toggleLanguage(lang)}
                                >
                                    <Text style={styles.languageChipText}>{lang}</Text>
                                </Pressable>
                            </Animated.View>
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
        backgroundColor: Colors.secondary,
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
        borderColor: Colors.secondary,
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
        backgroundColor: Colors.secondary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: Colors.secondary,
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
        color: Colors.secondary,
        fontWeight: '600',
    },
});
