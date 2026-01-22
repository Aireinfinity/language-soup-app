import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const SOUP_MESSAGES = {
    login: [
        "Checking the reservation...",
        "Polishing the spoons...",
        "Finding your table...",
        "Heating up the stove...",
        "Tieing the apron..."
    ],
    chat: [
        "Simmering the conversation...",
        "Passing the salt...",
        "Stirring the pot...",
        "Gathering the ingredients...",
        "Decanting the broth..."
    ],
    upload: [
        "Boiling the video...",
        "Chopping the pixels...",
        "Seasoning the audio...",
        "Marinating the content...",
        "Plating the dish..."
    ],
    general: [
        "Stirring the pot...",
        "Tasting the broth...",
        "Adding a pinch of salt...",
        "Checking the recipe...",
        "Waiting for it to boil..."
    ]
};

const SOUP_COLORS = {
    pink: '#ec008b',
    blue: '#00adef',
};

export function FunnyLoader({ type = 'general', color = SOUP_COLORS.pink, size = 'small' }) {
    const [message, setMessage] = useState('');

    useEffect(() => {
        const messages = SOUP_MESSAGES[type] || SOUP_MESSAGES.general;
        setMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, [type]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
            <Text style={[styles.text, { color }]}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        gap: 8,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    }
});
