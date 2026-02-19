import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

function triggerHaptic() {
    try { require('../utils/haptics').haptics.light(); } catch (_) {}
}

export function ReplyPreview({ replyTo, onCancel }) {
    if (!replyTo) return null;

    return (
        <View style={styles.container}>
            <View style={styles.bar} />
            <View style={styles.content}>
                <Text style={styles.label}>
                    replying to {replyTo.senderName || 'message'}
                </Text>
                <Text style={styles.message} numberOfLines={1}>
                    {replyTo.content}
                </Text>
            </View>
            <Pressable
                onPress={() => { triggerHaptic(); onCancel(); }}
                style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
                hitSlop={8}
            >
                <X size={20} color="#666" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FDF9F4',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,173,239,0.12)',
    },
    bar: {
        width: 4,
        height: 36,
        backgroundColor: Colors.primary,
        borderRadius: 2,
        marginRight: 12,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
        color: '#555',
    },
    closeButton: {
        padding: 8,
        marginLeft: 4,
    },
});
