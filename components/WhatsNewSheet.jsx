import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';

const SOUP_COLORS = {
    cream: '#FDF5E6',
    turquoise: '#00ADEF',
    pink: '#EC008B',
    text: '#2d3436',
    subtext: '#636e72',
};

/**
 * Minimal "what's new" / "where things are" — tap to open from Profile.
 * No tour, no steps. One screen, short copy, got it. See STRATEGY_AND_NOAH.md.
 */
export default function WhatsNewSheet({ visible, onClose }) {
    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <Text style={styles.title}>where things are</Text>
                    <Text style={styles.body}>
                        <Text style={styles.bold}>Today</Text> — send your voice. One challenge, one tap.{'\n\n'}
                        <Text style={styles.bold}>Community</Text> — hear everyone's voices. Podcast mode = listen to the soup in one go.{'\n\n'}
                        more voices live in the Community tab. explore and tap around — no tutorial, just soup.
                    </Text>
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
