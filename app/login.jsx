import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Image, ScrollView, Keyboard, TouchableWithoutFeedback, InteractionManager } from 'react-native';
import { FunnyLoader } from '../components/FunnyLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';

// Fewer emojis so everything fits on one page
const EMOJIS = [
    '😭', '🥳', '🤗', '🤯', '😚', '🤪', '🙀', '🌈', '😵‍💫', '🥹',
    '😰', '😍', '🫠', '🤩', '😘', '🍜', '😎', '🦄', '👑', '🇫🇷',
];

export default function LoginScreen() {
    const router = useRouter();
    const { signInWithName } = useAuth();
    const [name, setName] = useState('');
    const [password, setPassword] = useState([]);
    const [loading, setLoading] = useState(false);

    const addEmoji = (emoji) => {
        if (password.length < 3) setPassword([...password, emoji]);
    };

    const removeEmoji = () => setPassword(password.slice(0, -1));

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Hey! 👋🏿', 'We need to know what to call you');
            return;
        }
        if (password.length !== 3) {
            Alert.alert('Almost!', 'Pick exactly 3 emojis');
            return;
        }

        setLoading(true);
        try {
            const emojiPass = password.join('');
            const authData = await signInWithName(name.trim(), emojiPass);
            if (!authData?.user?.id) {
                throw new Error('Sign-in did not return a user');
            }

            Alert.alert(
                'save your password!',
                `Your password is ${password.join(' ')}. Screenshot or write it down so you can get back in if you ever get logged out (you probably won't need to. Noah has all passwords saved and can recover it if you forget).`,
                [{
                    text: 'got it',
                    onPress: () => {
                        InteractionManager.runAfterInteractions(() => {
                            requestAnimationFrame(() => {
                                try {
                                    router.replace('/onboarding/conversational');
                                } catch (e) {
                                    console.warn('[Login] replace failed:', e);
                                    router.push('/onboarding/conversational');
                                }
                            });
                        });
                    }
                }]
            );
        } catch (error) {
            console.error('Error:', error);
            if (error.message === 'Name already taken!') {
                Alert.alert(
                    'Name Taken 🙅',
                    'Someone else is using that name with a different password. Try a different name!',
                    [{ text: 'OK', onPress: () => { setPassword([]); setName(''); } }]
                );
            } else {
                Alert.alert('Oops!', 'Something went wrong. Try again?');
            }
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = name.trim().length > 0 && password.length === 3 && !loading;

    return (
        <SafeAreaView style={styles.container}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.logoContainer}>
                            <View style={styles.logoCircle}>
                                <Image source={require('../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
                            </View>
                            <Text style={styles.title}>language soup</Text>
                            <Text style={styles.subtitle}>what should we call you?</Text>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="your name"
                            placeholderTextColor={Colors.textLight}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                            blurOnSubmit
                        />

                <Text style={styles.emojiLabel}>tap 3 emojis. screenshot or write them down</Text>
                <View style={styles.passwordDisplay}>
                    {[0, 1, 2].map((i) => (
                        <View key={i} style={styles.emojiSlot}>
                            <Text style={styles.emojiText}>{password[i] || ''}</Text>
                        </View>
                    ))}
                    {password.length > 0 && (
                        <Pressable style={styles.deleteBtn} onPress={removeEmoji} hitSlop={8}>
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
                    style={[styles.button, !canSubmit && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                >
                    {loading ? <FunnyLoader type="login" color="#fff" /> : <Text style={styles.buttonText}>continue</Text>}
                </Pressable>

                <Text style={styles.disclaimer}>no email. your 3 emojis are your password</Text>
                    </ScrollView>
                </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
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
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 32,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.primary + '12',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    logoImage: {
        width: 44,
        height: 44,
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        color: Colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textLight,
        marginTop: 4,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        fontSize: 17,
        color: Colors.text,
        borderWidth: 2,
        borderColor: Colors.primary,
        marginBottom: 16,
    },
    emojiLabel: {
        fontSize: 13,
        color: Colors.textLight,
        textAlign: 'center',
        marginBottom: 10,
    },
    passwordDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    emojiSlot: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiText: { fontSize: 28 },
    deleteBtn: { padding: 6 },
    deleteBtnText: { fontSize: 24, color: '#666' },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 20,
    },
    emojiBtn: {
        width: 42,
        height: 42,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    gridEmojiText: { fontSize: 22 },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        minWidth: 180,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
    disclaimer: {
        fontSize: 12,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 12,
    },
});
