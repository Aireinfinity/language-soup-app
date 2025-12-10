import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';
import { Sparkles } from 'lucide-react-native';

export default function LoginScreen() {
    const { signInWithName } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    // Button scale animation
    const buttonScale = useSharedValue(1);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Hey! 👋', 'We need to know what to call you');
            return;
        }

        setLoading(true);
        try {
            await signInWithName(name.trim());
            // Navigation handled by AuthContext
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert('Oops! 😅', 'Something went wrong. Try again?');
        } finally {
            setLoading(false);
        }
    };

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }]
    }));

    const handlePressIn = () => {
        buttonScale.value = withSpring(0.95, { damping: 10 });
    };

    const handlePressOut = () => {
        buttonScale.value = withSpring(1, { damping: 10 });
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                {/* Header */}
                <Animated.View entering={FadeIn.delay(200)} style={styles.header}>
                    <View style={styles.logoCircle}>
                        <Image
                            source={require('../assets/images/logo.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>Language Soup</Text>
                    <Text style={styles.subtitle}>Sip, Slurp, Speak.</Text>
                </Animated.View>

                {/* Form */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>what should we call u? 👋</Text>
                        <View style={styles.inputWrapper}>
                            <Sparkles size={20} color={Colors.primary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="noah :))))"
                                placeholderTextColor="#999"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="none"
                                autoCorrect={false}
                                onSubmitEditing={handleSubmit}
                                returnKeyType="go"
                            />
                        </View>
                        <Text style={styles.hint}>emojis and special characters welcome! ✨</Text>
                    </View>

                    <Animated.View style={animatedButtonStyle}>
                        <Pressable
                            style={[
                                styles.primaryButton,
                                !name.trim() && styles.buttonDisabled,
                            ]}
                            onPress={handleSubmit}
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            disabled={loading || !name.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>let's go! 🥣</Text>
                            )}
                        </Pressable>
                    </Animated.View>

                    <Text style={styles.footer}>
                        (your account lives on this device)
                    </Text>
                </Animated.View>
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
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    header: {
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
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
    },
    logoImage: {
        width: 80,
        height: 80,
    },
    title: {
        fontSize: 36,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 20,
        color: Colors.textLight,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    inputContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: Colors.primary,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 18,
        color: Colors.text,
        paddingVertical: 18,
    },
    hint: {
        fontSize: 13,
        color: Colors.textLight,
        marginTop: 8,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
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
    primaryButtonText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    footer: {
        fontSize: 12,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 24,
        fontStyle: 'italic',
    },
});
