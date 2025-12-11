import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';

export default function LoginScreen() {
    const router = useRouter();
    const { signInWithName } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Hey! 👋', 'We need to know what to call you');
            return;
        }

        // Quick check if name is already taken
        try {
            const { data: existingUser } = await supabase
                .from('app_users')
                .select('id')
                .eq('display_name', name.trim())
                .maybeSingle();

            // Allow "Noah :)" to proceed (account re-claiming)
            if (existingUser && name.trim() !== 'Noah :)') {
                Alert.alert('Name Taken 😬', 'That name is already in use. Try another!');
                return;
            }
        } catch (err) {
            console.warn('Name check failed, proceeding anyway:', err);
        }

        setLoading(true);
        try {
            await signInWithName(name.trim());
            // Navigate to profile creation onboarding
            router.replace('/onboarding/conversational');
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Oops! 😅', 'Something went wrong. Try again?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoCircle}>
                        <Image
                            source={require('../assets/images/logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>language soup</Text>
                    <Text style={styles.subtitle}>what should we call you?</Text>
                </View>

                {/* Name Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="your name"
                        placeholderTextColor={Colors.textLight}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleSubmit}
                    />
                </View>

                {/* Continue Button */}
                <Pressable
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>continue</Text>
                    )}
                </Pressable>

                <Text style={styles.disclaimer}>
                    choose wisely—you can't change it later ✨
                </Text>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    logoImage: {
        width: 80,
        height: 80,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    inputContainer: {
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 18,
        color: Colors.text,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    disclaimer: {
        fontSize: 12,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 16,
        fontStyle: 'italic',
    },
});
