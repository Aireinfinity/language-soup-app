import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BookOpen, Calendar } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ff6b9d',
    yellow: '#ffd93d',
    green: '#6bcf7f',
    cream: '#fffbf5',
    subtext: '#666',
};

export function ChallengeBanner({ challenge, onPress }) {
    if (!challenge) return null;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                pressed && { opacity: 0.9 }
            ]}
        >
            <View style={styles.iconContainer}>
                <BookOpen size={18} color={SOUP_COLORS.blue} />
            </View>

            <View style={styles.content}>
                <Text style={styles.label}>Current Challenge</Text>
                <Text style={styles.promptText} numberOfLines={2}>
                    {challenge.prompt_text}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginHorizontal: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.blue,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 173, 239, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    promptText: {
        fontSize: 13,
        lineHeight: 17,
        color: '#000',
        fontWeight: '500',
    },
});
