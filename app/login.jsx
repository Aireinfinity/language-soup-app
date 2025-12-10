import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Colors } from '../constants/Colors';
import { Mail, ArrowRight, CheckCircle, Users } from 'lucide-react-native';

export default function LoginScreen() {
    const { signInWithMagicLink, verifyOtp, signInWithGuest, signInWithPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [usePassword, setUsePassword] = useState(false); // Toggle between OTP and password
    const [loading, setLoading] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [verifying, setVerifying] = useState(false);

    const handlePasswordLogin = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        if (!password.trim()) {
            Alert.alert('Invalid Password', 'Please enter your password.');
            return;
        }

        setLoading(true);
        try {
            await signInWithPassword(email.trim(), password.trim());
        } catch (error) {
            Alert.alert('Error', 'Invalid email or password.');
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            await signInWithGuest();
        } catch (error) {
            Alert.alert('Error', 'Could not sign in as guest. Please try again.');
            setLoading(false);
        }
    };

    const handleSendCode = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            await signInWithMagicLink(email.trim());
            setMagicLinkSent(true);
        } catch (error) {
            if (error.message.includes('security purposes')) {
                Alert.alert('Hold your horses! 🐴', 'Please wait a few seconds before requesting another code.');
            } else {
                Alert.alert('Error', error.message || 'Could not send code. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        const cleanCode = otpCode.trim();
        if (!cleanCode || cleanCode.length < 6) {
            Alert.alert('Invalid Code', 'Please enter the verification code from your email.');
            return;
        }

        setVerifying(true);
        try {
            await verifyOtp(email, cleanCode);
            // AuthContext will handle redirect
        } catch (error) {
            Alert.alert('Error', 'Invalid code. Please try again.');
            setVerifying(false);
        }
    };

    // OTP Screen
    if (magicLinkSent) {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.successContainer}>
                            <CheckCircle size={64} color={Colors.primary} />
                            <Text style={styles.successTitle}>Check your email!</Text>
                            <Text style={styles.successText}>
                                We sent a code to {email}.{'\n'}
                                Enter it below to log in:
                            </Text>

                            <View style={styles.otpContainer}>
                                <TextInput
                                    style={styles.otpInput}
                                    placeholder="123456"
                                    placeholderTextColor="#999"
                                    value={otpCode}
                                    onChangeText={setOtpCode}
                                    keyboardType="number-pad"
                                    maxLength={10}
                                    autoFocus
                                />
                                <Pressable
                                    style={[styles.primaryButton, (!otpCode || otpCode.length < 6) && styles.buttonDisabled]}
                                    onPress={handleVerifyCode}
                                    disabled={verifying || !otpCode || otpCode.length < 6}
                                >
                                    {verifying ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Verify Code</Text>
                                    )}
                                </Pressable>
                            </View>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={() => setMagicLinkSent(false)}
                            >
                                <Text style={styles.secondaryButtonText}>Use a different email</Text>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Login Screen
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Logo / Header */}
                    <View style={styles.header}>
                        <View style={styles.logoCircle}>
                            <Image
                                source={require('../assets/images/logo.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.title}>Language Soup</Text>
                        <Text style={styles.subtitle}>Sip, Slurp, Speak.</Text>
                    </View>

                    {/* Login Form */}
                    <View style={styles.actions}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color="#999" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="you@example.com"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        {usePassword && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#999"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            </View>
                        )}

                        <Pressable
                            style={[styles.primaryButton, (!email || loading || (usePassword && !password)) && styles.buttonDisabled]}
                            onPress={usePassword ? handlePasswordLogin : handleSendCode}
                            disabled={!email || loading || (usePassword && !password)}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.primaryButtonText}>
                                        {usePassword ? 'Sign In' : 'Send Code'}
                                    </Text>
                                    <ArrowRight size={20} color="#fff" />
                                </>
                            )}
                        </Pressable>

                        <Pressable
                            style={styles.toggleButton}
                            onPress={() => setUsePassword(!usePassword)}
                        >
                            <Text style={styles.toggleButtonText}>
                                {usePassword ? 'Use email code instead' : 'Admin? Use password'}
                            </Text>
                        </Pressable>

                        {!usePassword && (
                            <Text style={styles.disclaimer}>
                                We'll send you a 6-digit code to verify your email.
                            </Text>
                        )}

                        {/* Divider */}
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>or</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Guest Login */}
                        <Pressable
                            style={styles.guestButton}
                            onPress={handleGuestLogin}
                            disabled={loading}
                        >
                            <Users size={20} color={Colors.primary} />
                            <Text style={styles.guestButtonText}>Continue as Guest</Text>
                        </Pressable>

                        <Text style={styles.guestDisclaimer}>
                            Perfect for testing! No email required.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
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
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: Colors.textLight,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    actions: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
        paddingVertical: 16,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 12,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    toggleButton: {
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 12,
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    disclaimer: {
        fontSize: 12,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
    secondaryButton: {
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    successContainer: {
        alignItems: 'center',
        paddingTop: 60,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginTop: 24,
        marginBottom: 12,
    },
    successText: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    otpContainer: {
        width: '100%',
        maxWidth: 300,
    },
    otpInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: 24,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E5EA',
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 14,
        color: Colors.textLight,
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    guestButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
    },
    guestDisclaimer: {
        fontSize: 12,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 12,
    },
});
