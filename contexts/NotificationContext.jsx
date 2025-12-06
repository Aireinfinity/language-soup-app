import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

const NotificationContext = createContext({});

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState(null);
    const [notification, setNotification] = useState(null);
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

            // Listen for notifications
            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                setNotification(notification);
            });

            // Listen for notification interactions
            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                const data = response.notification.request.content.data;
                handleNotificationResponse(data);
            });

            return () => {
                if (notificationListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
                    Notifications.removeNotificationSubscription(notificationListener.current);
                }
                if (responseListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
                    Notifications.removeNotificationSubscription(responseListener.current);
                }
            };
        }
    }, [user]);

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
                    projectId: 'language-soup-mobile', // Using app slug for local development
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

    return (
        <NotificationContext.Provider
            value={{
                expoPushToken,
                notification,
                sendLocalNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
