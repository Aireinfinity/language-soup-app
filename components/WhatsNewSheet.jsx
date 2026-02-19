import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { WHATS_NEW } from '../constants/WhatsNewCopy';

const SOUP_COLORS = {
    cream: '#FDF5E6',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    text: '#2d3436',
    subtext: '#636e72',
};

/**
 * Minimal "what's new" — auto-shown once per version when they enter the app, or tap from Profile.
 * No tour, no steps. One screen, short bullets, got it. Copy in constants/WhatsNewCopy.js.
 */
export default function WhatsNewSheet({ visible, onClose }) {
    if (!visible) return null;

    const { title, items } = WHATS_NEW;
    const hasItems = Array.isArray(items) && items.length > 0;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <Text style={styles.title}>{title}</Text>
                    {hasItems ? (
                        <View style={styles.bulletList}>
                            {items.map((line, i) => (
                                <Text key={i} style={styles.bulletLine}>
                                    <Text style={styles.bullet}>• </Text>
                                    {line}
                                </Text>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.body}>
                            <Text style={styles.bold}>Today</Text> — send your voice. One challenge, one tap.{'\n\n'}
                            <Text style={styles.bold}>Community</Text> — hear everyone. Explore and tap around.
                        </Text>
                    )}
                    <Pressable style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]} onPress={onClose}>
                        <Text style={styles.buttonText}>got it</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: SOUP_COLORS.cream,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 16,
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
        color: SOUP_COLORS.subtext,
        marginBottom: 24,
    },
    bulletList: { marginBottom: 24 },
    bulletLine: { fontSize: 15, lineHeight: 22, color: SOUP_COLORS.subtext, marginBottom: 8 },
    bullet: { fontWeight: '700', color: SOUP_COLORS.text },
    bold: {
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    button: {
        backgroundColor: SOUP_COLORS.turquoise,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
