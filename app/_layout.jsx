import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { Colors } from '../constants/Colors';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Note: Firebase Crashlytics initialization removed for Expo Go compatibility
// It will be automatically initialized via app.json plugins in production builds

function RootLayoutNav() {
    const { loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            SplashScreen.hideAsync();
        }
    }, [loading]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" options={{ gestureEnabled: false }} />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="group-selection" />
            <Stack.Screen name="chat/[id]" />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <NotificationProvider>
                <RootLayoutNav />
            </NotificationProvider>
        </AuthProvider>
    );
}
