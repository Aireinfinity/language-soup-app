import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Bell, MessageCircle, Zap } from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { useNotifications } from '../../contexts/NotificationContext';
import * as Notifications from 'expo-notifications';

export default function NotificationScreen() {
    const router = useRouter();
    const { registerForPushNotificationsAsync } = useNotifications();
    const [loading, setLoading] = useState(false);

    const handleEnable = async () => {
        setLoading(true);
        try {
            // First, check current permission status
            const { status: existingStatus } = await Notifications.getPermissionsAsync();

            // If already denied, we can't request again, so send them to settings
            if (existingStatus === 'denied') {
                Alert.alert(
                    'Notifications Disabled',
                    'To get updates, please enable notifications in your phone settings.',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => handleContinue() },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                setLoading(false);
                return;
            }

            // Otherwise, try to register (this triggers the system prompt)
            await registerForPushNotificationsAsync();

            // Move on regardless of the outcome
            handleContinue();
        } catch (error) {
            console.error('Error enabling notifications:', error);
            handleContinue();
        }
    };

    const handleContinue = () => {
        // Must go to group selection!
        router.replace('/group-selection');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Bell size={48} color={Colors.primary} fill={Colors.primary + '20'} />
                    </View>
                    <Text style={styles.title}>don't miss the spice 🌶️</Text>
                    <Text style={styles.subtitle}>know when your language challenge drops or someone replies to your voice memo</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.features}>
                    <View style={styles.featureRow}>
                        <View style={styles.featureIcon}>
                            <MessageCircle size={24} color={Colors.text} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>replies & reactions</Text>
                            <Text style={styles.featureDescription}>see when people love your soup</Text>
                        </View>
                    </View>

                    <View style={styles.featureRow}>
                        <View style={styles.featureIcon}>
                            <Zap size={24} color={Colors.text} />
                        </View>
                        <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>daily drops</Text>
                            <Text style={styles.featureDescription}>get the new challenge instantly</Text>
                        </View>
                    </View>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Pressable
                    onPress={handleEnable}
                    style={styles.button}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>turn on notifications</Text>
                    )}
                </Pressable>

                <Pressable onPress={handleContinue} style={styles.skipButton}>
                    <Text style={styles.skipText}>maybe later</Text>
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
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        paddingHorizontal: 12,
        lineHeight: 22,
    },
    features: {
        width: '100%',
        gap: 20,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        color: Colors.textLight,
    },
    footer: {
        padding: 24,
        backgroundColor: Colors.background,
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
