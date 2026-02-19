import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

const URL_REGEX = /^https?:\/\/[^\s]+$/i;

export function getFirstUrl(text) {
    if (!text || typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (URL_REGEX.test(trimmed)) return trimmed;
    const match = trimmed.match(/(https?:\/\/[^\s]+)/i);
    return match ? match[1] : null;
}

function getDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return 'link';
    }
}

export function LinkPreviewCard({ url, isMe, onPress }) {
    const domain = getDomain(url);
    const handlePress = () => {
        if (onPress) onPress();
        else Linking.openURL(url).catch(() => {});
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.card,
                isMe ? styles.cardMe : styles.cardThem,
                pressed && { opacity: 0.9 },
            ]}
        >
            <View style={styles.row}>
                <ExternalLink size={16} color={isMe ? 'rgba(255,255,255,0.9)' : Colors.primary} />
                <Text style={[styles.domain, isMe && styles.domainMe]} numberOfLines={1}>
                    {domain}
                </Text>
            </View>
            <Text style={[styles.openText, isMe && styles.openTextMe]}>open link</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    cardMe: {
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    domain: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
        flex: 1,
    },
    domainMe: {
        color: 'rgba(255,255,255,0.95)',
    },
    openText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textLight,
        marginTop: 4,
    },
    openTextMe: {
        color: 'rgba(255,255,255,0.8)',
    },
});
