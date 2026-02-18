import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { OnboardingSwipeForward } from '../../components/OnboardingSwipeForward';
import { getRandomTagline, getRandomTaglineChipsWithLanguages, pickRandom, TAGLINE_SUGGESTIONS } from '../../constants/CopyPhilosophy';
import { getAvatarSource, getDefaultSoupAvatarForId } from '../../utils/soupUtils';

function displayLang(lang) {
    if (!lang || typeof lang !== 'string') return '';
    return lang.split(' (')[0].split('/')[0].trim() || lang.trim();
}

export default function TaglineScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [tagline, setTagline] = useState(() => getRandomTagline([]));
    const [saving, setSaving] = useState(false);
    const [inspirationChips, setInspirationChips] = useState(() => getRandomTaglineChipsWithLanguages(10, []));
    const [placeholder, setPlaceholder] = useState(() => pickRandom(TAGLINE_SUGGESTIONS));
    const [communityTaglines, setCommunityTaglines] = useState([]);

    const userLanguages = useCallback(async () => {
        if (!user?.id) return [];
        const { data } = await supabase.from('app_users').select('learning_languages, fluent_languages').eq('id', user.id).maybeSingle();
        const langs = data?.learning_languages || data?.fluent_languages || [];
        return Array.isArray(langs) ? langs : [];
    }, [user?.id]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const langs = await userLanguages();
            const normalized = (langs || []).map(displayLang).filter(Boolean);
            if (!mounted) return;
            setTagline(getRandomTagline(normalized));
            setInspirationChips(getRandomTaglineChipsWithLanguages(10, normalized));
        })();
        return () => { mounted = false; };
    }, [userLanguages]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('app_users')
                .select('id, status_text, avatar_url')
                .not('status_text', 'is', null)
                .limit(12);
            if (cancelled || !data?.length) return;
            const others = (data || [])
                .filter((u) => u.id !== user?.id && (u.status_text || '').trim().length > 0)
                .slice(0, 8)
                .map((u) => ({ id: u.id, status_text: (u.status_text || '').trim(), avatar_url: u.avatar_url || getDefaultSoupAvatarForId(u.id) }));
            setCommunityTaglines(others);
        })();
        return () => { cancelled = true; };
    }, [user?.id]);

    const shuffleTagline = useCallback(async () => {
        const langs = await userLanguages();
        const normalized = (langs || []).map(displayLang).filter(Boolean);
        setTagline(getRandomTagline(normalized));
        setInspirationChips(getRandomTaglineChipsWithLanguages(10, normalized));
        setPlaceholder(pickRandom(TAGLINE_SUGGESTIONS));
    }, [userLanguages]);

    const handleContinue = async () => {
        if (!tagline.trim()) return;

        setSaving(true);
        try {
            await supabase
                .from('app_users')
                .update({ status_text: tagline.trim() })
                .eq('id', user.id);

            // Navigate to avatar setup
            router.push('/onboarding/avatar');
        } catch (error) {
            console.error('Error saving tagline:', error);
            Alert.alert('Error', 'Failed to save tagline');
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        router.push('/onboarding/avatar');
    };

    const handleSwipeForward = () => {
        if (tagline.trim() && !saving) handleContinue();
        else handleSkip();
    };

    return (
        <SafeAreaView style={styles.container}>
            <OnboardingSwipeForward onSwipeForward={handleSwipeForward} onSwipeBack={() => router.replace('/onboarding/your-groups')}>
            <Pressable onPress={() => router.replace('/onboarding/your-groups')} style={styles.backRow} hitSlop={12}>
                <Text style={styles.backText}>← back</Text>
            </Pressable>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
                        <Text style={styles.title}>give yourself a tagline ✨</Text>
                        <Text style={styles.subtitle}>make it fun, make it you — we'll match you with people who get it</Text>
                    </Animated.View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder={placeholder}
                            placeholderTextColor="#999"
                            value={tagline}
                            onChangeText={setTagline}
                            maxLength={50}
                            autoFocus
                        />

                        <View style={styles.inspirationRow}>
                            <Text style={styles.examplesTitle}>need inspiration?</Text>
                            <Pressable onPress={shuffleTagline} style={({ pressed }) => [styles.shuffleButton, pressed && { opacity: 0.7 }]}>
                                <Text style={styles.shuffleButtonText}>another one</Text>
                            </Pressable>
                        </View>
                        <View style={styles.examples}>
                            {inspirationChips.map((chip, idx) => (
                                <Pressable
                                    key={`${chip}-${idx}`}
                                    style={({ pressed }) => [styles.exampleChip, pressed && { opacity: 0.8 }]}
                                    onPress={() => setTagline(chip)}
                                >
                                    <Text style={styles.exampleText}>{chip}</Text>
                                </Pressable>
                            ))}
                        </View>

                        {communityTaglines.length > 0 && (
                            <View style={styles.communitySection}>
                                <Text style={styles.communityTitle}>what others chose</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.communityScroll} contentContainerStyle={styles.communityScrollContent}>
                                    {communityTaglines.map((u) => {
                                        const source = getAvatarSource(u.avatar_url);
                                        return (
                                            <Pressable
                                                key={u.id}
                                                style={({ pressed }) => [styles.communityCard, pressed && { opacity: 0.9 }]}
                                                onPress={() => setTagline(u.status_text)}
                                            >
                                                <View style={styles.communityAvatarWrap}>
                                                    {source ? (
                                                        <Image source={source} style={styles.communityAvatar} />
                                                    ) : (
                                                        <View style={[styles.communityAvatar, styles.communityAvatarPlaceholder]} />
                                                    )}
                                                </View>
                                                <Text style={styles.communityTagline} numberOfLines={2}>{u.status_text}</Text>
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Pressable
                        onPress={handleContinue}
                        style={[styles.button, !tagline.trim() && styles.buttonDisabled]}
                        disabled={saving || !tagline.trim()}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>continue</Text>
                        )}
                    </Pressable>

                    <Pressable onPress={handleSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>skip for now</Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
            </OnboardingSwipeForward>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingVertical: 20,
        paddingBottom: 24,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    form: {
        width: '100%',
        paddingHorizontal: 24,
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
        lineHeight: 22,
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 18,
        fontSize: 18,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 32,
    },
    inspirationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    examplesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textLight,
        textAlign: 'center',
    },
    shuffleButton: {
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    shuffleButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    examples: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    exampleChip: {
        backgroundColor: '#f8f8f8',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    exampleText: {
        fontSize: 14,
        color: Colors.text,
    },
    communitySection: {
        marginTop: 28,
    },
    communityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textLight,
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    communityScroll: {
        marginHorizontal: -24,
    },
    communityScrollContent: {
        paddingHorizontal: 24,
        flexDirection: 'row',
        paddingRight: 36,
    },
    communityCard: {
        width: 140,
        marginRight: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#eee',
        alignItems: 'center',
    },
    communityAvatarWrap: {
        marginBottom: 8,
    },
    communityAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    communityAvatarPlaceholder: {
        backgroundColor: Colors.primary + '30',
    },
    communityTagline: {
        fontSize: 12,
        color: Colors.text,
        textAlign: 'center',
        lineHeight: 16,
    },
    footer: {
        padding: 24,
        backgroundColor: Colors.background, // Ensure footer has background over scroll content
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
