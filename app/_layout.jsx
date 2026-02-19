/*
import { View, Text } from 'react-native';
*/
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { AudioPlayerProvider } from '../contexts/AudioPlayerContext';
import { MiniAudioPlayer } from '../components/MiniAudioPlayer';
import { PodcastPlayerExpanded } from '../components/PodcastPlayerExpanded';
import { PodcastEndSummary } from '../components/PodcastEndSummary';
import { Colors } from '../constants/Colors';
import { QuestProvider } from '../contexts/QuestContext';
import { AppErrorBoundary } from '../components/AppErrorBoundary';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Note: Firebase Crashlytics initialization removed for Expo Go compatibility
// It will be automatically initialized via app.json plugins in production builds

function RootLayoutNav() {
    const { loading } = useAuth();

    useEffect(() => {
        // Android Navigation Bar Fix: Make it transparent
        if (Platform.OS === 'android') {
            NavigationBar.setPositionAsync('absolute');
            NavigationBar.setBackgroundColorAsync('#00000000'); // Fully transparent
            NavigationBar.setButtonStyleAsync('dark'); // Dark icons
        }

        if (!loading) {
            SplashScreen.hideAsync();
        }
    }, [loading]);

    return (
        <>
            <Stack screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                animation: 'default',
            }}>
                <Stack.Screen name="index" options={{ gestureEnabled: false }} />
                <Stack.Screen name="login" options={{ gestureEnabled: false }} />
                <Stack.Screen name="how-it-works" />
                <Stack.Screen name="ground-rules" options={{ gestureEnabled: false }} />
                <Stack.Screen name="profile-creation" />
                <Stack.Screen name="group-selection" />
                <Stack.Screen name="browse-groups" />
                <Stack.Screen name="add-language" />
                <Stack.Screen name="your-groups" />
                <Stack.Screen name="group-info" />
                <Stack.Screen name="native-speakers" />
                <Stack.Screen name="add-native-speaker" />
                <Stack.Screen name="status-page" />
                <Stack.Screen name="login-callback" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="profile-modal" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="chat/[id]" options={{ animation: 'default' }} />
            </Stack>
            <MiniAudioPlayer />
            <PodcastPlayerExpanded />
            <PodcastEndSummary />
        </>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AppErrorBoundary>
                <AuthProvider>
                    <NotificationProvider>
                        <AudioPlayerProvider>
                            <QuestProvider>
                                <RootLayoutNav />
                            </QuestProvider>
                        </AudioPlayerProvider>
                    </NotificationProvider>
                </AuthProvider>
            </AppErrorBoundary>
        </GestureHandlerRootView>
    );
}
