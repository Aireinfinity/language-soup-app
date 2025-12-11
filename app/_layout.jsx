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
        <Stack screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            animation: 'default',
        }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" options={{ gestureEnabled: false }} />
            <Stack.Screen name="how-it-works" />
            <Stack.Screen name="profile-creation" />
            <Stack.Screen name="group-selection" />
            <Stack.Screen name="browse-groups" />
            <Stack.Screen name="group-info" />
            <Stack.Screen name="native-speakers" />
            <Stack.Screen name="add-native-speaker" />
            <Stack.Screen name="status-page" />
            <Stack.Screen name="login-callback" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding/avatar" />
            <Stack.Screen name="onboarding/conversational" />
            <Stack.Screen name="onboarding/learning" />
            <Stack.Screen name="onboarding/tagline" />
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
