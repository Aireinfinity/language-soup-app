import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Linking from 'expo-linking';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
// Conditionally import expo-notifications (not available in Expo Go on Android SDK 53+)
let Notifications;
try {
    Notifications = require('expo-notifications');

    // Configure notifications - Guarded for Expo Go Android
    if (Platform.OS === 'ios' || !Device.isDevice || (Platform.OS === 'android' && Constants?.appOwnership !== 'expo')) {
        try {
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                }),
            });
        } catch (e) {
            console.warn('Notification handler setup failed:', e);
        }
    }
} catch (e) {
    console.log('expo-notifications not available (Expo Go limitation). Use development build for full notification support.');
    // Provide mock Notifications object for Expo Go
    Notifications = {
        getPermissionsAsync: async () => ({ status: 'undetermined' }),
        requestPermissionsAsync: async () => ({ status: 'denied' }),
        getExpoPushTokenAsync: async () => ({ data: null }),
        setNotificationChannelAsync: async () => { },
        addNotificationReceivedListener: () => ({ remove: () => { } }),
        addNotificationResponseReceivedListener: () => ({ remove: () => { } }),
        removeNotificationSubscription: () => { },
        scheduleNotificationAsync: async () => { },
        dismissAllNotificationsAsync: async () => { },
        setBadgeCountAsync: async () => { },
        getPresentedNotificationsAsync: async () => [],
        dismissNotificationAsync: async () => { },
    };
}

const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState(null);
    const [notification, setNotification] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState(null); // 'granted' | 'denied' | 'undetermined'
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        if (user) {
            registerForPushNotificationsAsync().then(token => {
                setExpoPushToken(token);
                if (token) {
                    savePushToken(token);
                }
            });

            checkPermissions();

            // Listen for notifications
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                setNotification(notification);
            });

            // Listen for notification interactions
            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                const data = response.notification.request.content.data;
                handleNotificationResponse(data);
            });

            // Re-check permissions when app comes to foreground
            const subscription = Linking.addEventListener('url', () => {
                checkPermissions();
            });

            return () => {
                if (notificationListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
                    Notifications.removeNotificationSubscription(notificationListener.current);
                }
                if (responseListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
                    Notifications.removeNotificationSubscription(responseListener.current);
                }
                subscription.remove();
            };
        }
    }, [user]);

    const checkPermissions = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
        return status;
    };

    const openSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    };

    const registerForPushNotificationsAsync = async () => {
        let token;

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push token for push notification!');
                return;
            }

            try {
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId: 'affb0dd3-57d0-467c-b84c-d08c10e3b9ce', // Ensuring exact EAS Project ID
                })).data;
            } catch (error) {
                console.log('Push notifications not available in Expo Go. Use development build for full support.');
                return null;
            }
        } else {
            console.log('Must use physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return token;
    };

    const savePushToken = async (token) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('app_push_tokens')
                .upsert({
                    user_id: user.id,
                    expo_push_token: token,
                    platform: Platform.OS,
                    updated_at: new Date().toISOString(),
                });

            if (error) console.error('Error saving push token:', error);
        } catch (error) {
            console.error('Error saving push token:', error);
        }
    };

    const handleNotificationResponse = (data) => {
        // Handle notification tap - navigate to relevant screen
        if (data.type === 'message' && data.groupId) {
            // Navigate to chat screen
            // router.push(`/chat/${data.groupId}`);
        } else if (data.type === 'challenge') {
            // Navigate to challenge
        }
    };

    const sendLocalNotification = async (title, body, data = {}) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
            },
            trigger: null, // Show immediately
        });
    };

    const clearNotifications = async () => {
        try {
            // Dismiss all notifications
            await Notifications.dismissAllNotificationsAsync();
            // Reset badge count
            await Notifications.setBadgeCountAsync(0);
        } catch (error) {
            console.log('Error clearing notifications:', error);
        }
    };

    const clearGroupNotifications = async (groupId) => {
        // Get all delivered notifications
        const deliveredNotifications = await Notifications.getPresentedNotificationsAsync();

        // Filter and dismiss only notifications for this group
        for (const notification of deliveredNotifications) {
            if (notification.request.content.data?.groupId === groupId) {
                await Notifications.dismissNotificationAsync(notification.request.identifier);
            }
        }

        // Update badge count
        const remaining = await Notifications.getPresentedNotificationsAsync();
        await Notifications.setBadgeCountAsync(remaining.length);
    };

    return (
        <NotificationContext.Provider
            value={{
                expoPushToken,
                notification,
                permissionStatus,
                checkPermissions,
                openSettings,
                sendLocalNotification,
                clearNotifications,
                clearGroupNotifications,
                registerForPushNotificationsAsync,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
