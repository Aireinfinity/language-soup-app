import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react-native';

export default function LoginScreen() {
    const { signInWithGuest, signInWithMagicLink, verifyOtp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const router = useRouter();

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            await signInWithGuest();
        } catch (error) {
            Alert.alert('Error', 'Could not sign in as guest. Please try again.');
            setLoading(false);
        }
    };

    const handleMagicLink = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            await signInWithMagicLink(email.trim());
            setMagicLinkSent(true);
            setLoading(false);
        } catch (error) {
            if (error.message.includes('security purposes')) {
                Alert.alert('Hold your horses! 🐴', 'Please wait a few seconds before requesting another code.');
            } else {
                Alert.alert('Error', error.message || 'Could not send login code. Please try again.');
            }
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        Alert.alert(
            'Coming Soon',
            `${provider} login requires additional setup. Please use Email or Guest Access for now! 🍲`
        );
    };



    const handleVerifyOtp = async () => {
        const cleanCode = otpCode.trim();
        if (!cleanCode || cleanCode.length < 6 || cleanCode.length > 8) {
            Alert.alert('Invalid Code', 'Please enter the 6-8 digit code from your email.');
            return;
        }

        setVerifying(true);
        try {
            await verifyOtp(email, cleanCode);
            // AuthContext will handle the redirect upon successful session update
        } catch (error) {
            Alert.alert('Error', 'Invalid code. Please try again.');
            setVerifying(false);
        }
    };

    if (magicLinkSent) {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>
                        <View style={styles.successContainer}>
                            <CheckCircle size={64} color={Colors.primary} />
                            <Text style={styles.successTitle}>Check your email!</Text>
                            <Text style={styles.successText}>
                                We sent a magic link to {email}.{'\n'}
                                Click it to log in, or enter the code below:
                            </Text>

                            <View style={styles.otpContainer}>
                                <TextInput
                                    style={styles.otpInput}
                                    placeholder="123456"
                                    placeholderTextColor="#999"
                                    value={otpCode}
                                    onChangeText={setOtpCode}
                                    keyboardType="number-pad"
                                    maxLength={8}
                                    autoFocus
                                />
                                <Pressable
                                    style={[styles.primaryButton, (!otpCode || otpCode.length < 6) && styles.buttonDisabled]}
                                    onPress={handleVerifyOtp}
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

                    {/* Login Options */}
                    <View style={styles.actions}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color={Colors.textLight} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="name@example.com"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        <Pressable
                            style={[styles.primaryButton, !email.trim() && styles.buttonDisabled]}
                            onPress={handleMagicLink}
                            disabled={loading || !email.trim()}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.primaryButtonText}>Send Login Code</Text>
                                    <ArrowRight size={20} color="#fff" />
                                </>
                            )}
                        </Pressable>

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                            <View style={styles.line} />
                        </View>

                        <Pressable
                            style={[styles.socialButton, styles.appleButton]}
                            onPress={() => handleSocialLogin('Apple')}
                        >
                            <View style={styles.iconContainer}>
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}></Text>
                            </View>
                            <Text style={styles.appleButtonText}>Apple</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.socialButton, styles.googleButton]}
                            onPress={() => handleSocialLogin('Google')}
                        >
                            <View style={styles.iconContainer}>
                                <Text style={{ fontWeight: 'bold', fontSize: 18 }}>G</Text>
                            </View>
                            <Text style={styles.googleButtonText}>Google</Text>
                        </Pressable>

                        <Pressable
                            style={styles.guestLink}
                            onPress={handleGuestLogin}
                            disabled={loading}
                        >
                            <Text style={styles.guestLinkText}>Continue as Guest</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.footerText}>
                        By continuing, you agree to our Terms & Privacy Policy.
                    </Text>
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
        padding: 24,
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    logoImage: {
        width: 70,
        height: 70,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.textLight,
        fontWeight: '500',
    },
    actions: {
        gap: 16,
        width: '100%',
    },
    inputContainer: {
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
        height: '100%',
    },
    primaryButton: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        position: 'absolute',
        left: 24,
    },
    appleButton: {
        backgroundColor: '#000',
    },
    appleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    googleButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    googleButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E5E5',
    },
    dividerText: {
        marginHorizontal: 16,
        color: Colors.textLight,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
    },
    guestLink: {
        alignItems: 'center',
        padding: 12,
    },
    guestLinkText: {
        color: Colors.textLight,
        fontSize: 16,
        fontWeight: '500',
    },
    footerText: {
        textAlign: 'center',
        color: Colors.textLight,
        fontSize: 12,
        marginTop: 24,
    },
    successContainer: {
        alignItems: 'center',
        padding: 24,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
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
    secondaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    secondaryButtonText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    otpContainer: {
        width: '100%',
        gap: 16,
        marginBottom: 24,
    },
    otpInput: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        padding: 16,
        fontSize: 24,
        textAlign: 'center',
        letterSpacing: 8,
        fontWeight: 'bold',
        color: Colors.text,
    },
});
