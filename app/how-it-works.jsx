import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mic, MessageCircle, Bell } from 'lucide-react-native';
import { useNotifications } from '../contexts/NotificationContext';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    card: '#ffffff',
};

export default function HowItWorksScreen() {
    const router = useRouter();
    const { registerForPushNotificationsAsync } = useNotifications();
    const [notifLoading, setNotifLoading] = useState(false);

    const handleBack = () => {
        router.replace('/');
    };

    const handleTurnOnNotifications = async () => {
        setNotifLoading(true);
        try {
            const { status: existing } = await Notifications.getPermissionsAsync();
            if (existing === 'denied') {
                Alert.alert(
                    'Notifications off',
                    'You previously disabled notifications. Turn them on in Settings to get challenge reminders.',
                    [
                        { text: 'Not now' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() },
                    ]
                );
                setNotifLoading(false);
                return;
            }
            // Explicitly request so the system permission prompt appears on the device
            if (existing !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                if (status !== 'granted') {
                    setNotifLoading(false);
                    return;
                }
            }
            await registerForPushNotificationsAsync();
        } catch (e) {
            console.warn('Notifications:', e);
        }
        setNotifLoading(false);
    };

    const handleGetStarted = () => {
        router.replace('/login');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={handleBack} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]} hitSlop={12}>
                    <ArrowLeft size={24} color={SOUP_COLORS.text} />
                </Pressable>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.headline}>the only app where you actually speak</Text>
                <Text style={styles.subhead}>daily voice challenges, small groups. no classrooms.</Text>

                <View style={styles.cards}>
                    <View style={[styles.card, { borderLeftColor: SOUP_COLORS.green }]}>
                        <View style={[styles.cardIconWrap, { backgroundColor: `${SOUP_COLORS.green}18` }]}>
                            <Mic size={28} color={SOUP_COLORS.green} strokeWidth={2} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Today</Text>
                            <Text style={styles.cardBody}>get the daily challenge, send a voice memo. that's it.</Text>
                        </View>
                    </View>

                    <View style={[styles.card, { borderLeftColor: SOUP_COLORS.turquoise }]}>
                        <View style={[styles.cardIconWrap, { backgroundColor: `${SOUP_COLORS.turquoise}18` }]}>
                            <MessageCircle size={28} color={SOUP_COLORS.turquoise} strokeWidth={2} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Community</Text>
                            <Text style={styles.cardBody}>listen to others, get the pulse of the soup.</Text>
                        </View>
                    </View>

                    <View style={[styles.card, { borderLeftColor: SOUP_COLORS.pink }]}>
                        <View style={[styles.cardIconWrap, { backgroundColor: `${SOUP_COLORS.pink}18` }]}>
                            <Bell size={28} color={SOUP_COLORS.pink} strokeWidth={2} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Notifications</Text>
                            <Text style={styles.cardBody}>turn them on so you know when the challenge drops.</Text>
                        </View>
                    </View>
                </View>

                <Pressable
                    onPress={handleTurnOnNotifications}
                    style={({ pressed }) => [styles.notifBtn, pressed && { opacity: 0.9 }]}
                    disabled={notifLoading}
                >
                    {notifLoading ? (
                        <ActivityIndicator size="small" color={SOUP_COLORS.pink} />
                    ) : (
                        <Text style={styles.notifBtnText}>turn on notifications</Text>
                    )}
                </Pressable>

                <Pressable
                    onPress={handleGetStarted}
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
                >
                    <Text style={styles.primaryBtnText}>get started</Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 48,
    },
    headline: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        lineHeight: 34,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subhead: {
        fontSize: 17,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 32,
        lineHeight: 24,
    },
    cards: {
        gap: 16,
        marginBottom: 28,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.card,
        borderRadius: 20,
        padding: 18,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    cardBody: {
        fontSize: 15,
        fontWeight: '500',
        color: SOUP_COLORS.subtext,
        lineHeight: 22,
    },
    notifBtn: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
        backgroundColor: `${SOUP_COLORS.pink}08`,
        alignItems: 'center',
        marginBottom: 16,
    },
    notifBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
    },
    primaryBtn: {
        backgroundColor: SOUP_COLORS.turquoise,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: SOUP_COLORS.turquoise,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryBtnText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
});
