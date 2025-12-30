import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';

// Emoji options for password
const EMOJIS = [
    '😭', '🥳', '🤗', '🤯', '😚', '🤪', '🙀', '🌈', '😵‍💫', '🥹',
    '😰', '😍', '🫠', '🤬', '🤩', '😘', '🍜', '😩', '🦄', '🪄',
    '😎', '😈', '😻', '👅', '💅🏾', '🌝', '🍷', '👑', '🏳️‍🌈', '🇫🇷',
    '🇧🇷', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🇪🇸', '🇲🇽', '🇦🇷', '🇵🇭', '🇩🇪', '🇳🇬', '🇭🇺', '🇮🇹'
];

export default function LoginScreen() {
    const router = useRouter();
    const { signInWithName } = useAuth();
    const [step, setStep] = useState('name'); // 'name' | 'password'
    const [name, setName] = useState('');
    const [password, setPassword] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);

    const handleNameSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Hey! 👋', 'We need to know what to call you');
            return;
        }

        setLoading(true);
        try {
            // Check if user exists
            const { data: existing } = await supabase
                .from('app_users')
                .select('id, emoji_password')
                .eq('display_name', name.trim())
                .maybeSingle();

            setIsNewUser(!existing);
            setStep('password');
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const addEmoji = (emoji) => {
        if (password.length < 3) {
            setPassword([...password, emoji]);
        }
    };

    const removeEmoji = () => {
        setPassword(password.slice(0, -1));
    };

    const handlePasswordSubmit = async () => {
        if (password.length !== 3) {
            Alert.alert('Almost!', 'Pick exactly 3 emojis');
            return;
        }

        setLoading(true);
        try {
            const emojiPass = password.join('');

            if (isNewUser) {
                // Create new account
                await signInWithName(name.trim(), emojiPass);
                router.replace('/onboarding/conversational');
            } else {
                // Login - check password
                const { data: userProfile } = await supabase
                    .from('app_users')
                    .select('id, emoji_password')
                    .eq('display_name', name.trim())
                    .single();

                if (userProfile?.emoji_password === emojiPass) {
                    await signInWithName(name.trim(), emojiPass);
                    router.replace('/(tabs)');
                } else if (!userProfile?.emoji_password) {
                    // MIGRATION: User has no password set yet
                    await signInWithName(name.trim(), emojiPass);
                    router.replace('/(tabs)');
                } else {
                    Alert.alert('Wrong password! 😬', 'Try again');
                    setPassword([]);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (error.message === 'Name already taken!') {
                Alert.alert('Name Taken 🙅', 'Someone else is using that name with a different password.');
            } else {
                Alert.alert('Oops!', 'Something went wrong. Try again?');
            }
        } finally {
            setLoading(false);
        }
    };

    // Name screen
    if (step === 'name') {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoCircle}>
                            <Image source={require('../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                        </View>
                        <Text style={styles.title}>language soup</Text>
                        <Text style={styles.subtitle}>
                            {isNewUser ? "what should we call you?" : "welcome back! what's your name?"}
                        </Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="your name"
                            placeholderTextColor={Colors.textLight}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            autoCorrect={false}
                            returnKeyType="next"
                            onSubmitEditing={handleNameSubmit}
                            autoFocus
                        />
                    </View>

                    <Pressable
                        style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
                        onPress={handleNameSubmit}
                        disabled={!name.trim() || loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>continue</Text>}
                    </Pressable>

                    <Text style={styles.disclaimer}>
                        {loading ? "searching for your soup profile..." : "choose wisely—you can't change it later ✨"}
                    </Text>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Password screen
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoContainer}>
                    <Text style={styles.title}>
                        {isNewUser ? "secure your soup 🍲" : "secure your profile 🔒"}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isNewUser
                            ? "pick 3 emojis to create your password"
                            : "looks like you've been here! set a 3-emoji password to save your progress forever."}
                    </Text>

                    {isNewUser || !password.length ? (
                        <View style={styles.screenshotWarning}>
                            <Text style={styles.screenshotText}>📸 Take a screenshot of your 3 emojis! You'll need them to log back in.</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.passwordDisplay}>
                    {[0, 1, 2].map((i) => (
                        <View key={i} style={styles.emojiSlot}>
                            <Text style={styles.emojiText}>{password[i] || ''}</Text>
                        </View>
                    ))}
                    {password.length > 0 && (
                        <Pressable style={styles.deleteBtn} onPress={removeEmoji}>
                            <Text style={styles.deleteBtnText}>⌫</Text>
                        </Pressable>
                    )}
                </View>

                <View style={styles.grid}>
                    {EMOJIS.map((emoji) => (
                        <Pressable
                            key={emoji}
                            style={styles.emojiBtn}
                            onPress={() => addEmoji(emoji)}
                        >
                            <Text style={styles.gridEmojiText}>{emoji}</Text>
                        </Pressable>
                    ))}
                </View>

                <Pressable
                    style={[styles.button, (password.length !== 3 || loading) && styles.buttonDisabled]}
                    onPress={handlePasswordSubmit}
                    disabled={password.length !== 3 || loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isNewUser ? 'create account' : 'claim & secure'}</Text>}
                </Pressable>
            </ScrollView>
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
        padding: 24,
        justifyContent: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logoImage: {
        width: 60,
        height: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: Colors.text,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 8,
    },
    screenshotWarning: {
        backgroundColor: '#FFF3CD',
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#FFEEBA',
    },
    screenshotText: {
        color: '#856404',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '600',
    },
    inputContainer: { marginBottom: 24 },
    input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 18, color: Colors.text, borderWidth: 2, borderColor: Colors.primary },
    passwordDisplay: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32, alignItems: 'center' },
    emojiSlot: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#fff', borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
    emojiText: { fontSize: 36 },
    deleteBtn: { padding: 8 },
    deleteBtnText: { fontSize: 32, color: '#666' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 },
    emojiBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    gridEmojiText: { fontSize: 26 },
    button: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', minWidth: 200 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
    disclaimer: { fontSize: 13, color: Colors.textLight, textAlign: 'center', marginTop: 16 },
});
