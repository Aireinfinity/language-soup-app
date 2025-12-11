import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const EXAMPLE_TAGLINES = [
    'founder daddy',
    'scared to send voice memos',
    'rambler',
    'lurker',
    'community momager',
    'slay slay slay',
    'always late to challenges',
    'polyglot in training',
];

export default function TaglineScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [tagline, setTagline] = useState('');
    const [saving, setSaving] = useState(false);

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

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
                        <Text style={styles.title}>give yourself a tagline ✨</Text>
                        <Text style={styles.subtitle}>make it fun, make it you</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="language soup enthusiast"
                            placeholderTextColor="#999"
                            value={tagline}
                            onChangeText={setTagline}
                            maxLength={50}
                            autoFocus
                        />

                        <Text style={styles.examplesTitle}>need inspiration?</Text>
                        <View style={styles.examples}>
                            {EXAMPLE_TAGLINES.map(example => (
                                <Pressable
                                    key={example}
                                    style={styles.exampleChip}
                                    onPress={() => setTagline(example)}
                                >
                                    <Text style={styles.exampleText}>{example}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
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
        justifyContent: 'center',
        paddingVertical: 20,
    },
    form: {
        width: '100%',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        marginBottom: 32,
        textAlign: 'center',
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
    examplesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textLight,
        marginBottom: 12,
        textAlign: 'center',
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
});
