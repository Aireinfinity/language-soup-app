import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export function ReplyPreview({ replyTo, onCancel }) {
    if (!replyTo) return null;

    return (
        <View style={styles.container}>
            <View style={styles.bar} />
            <View style={styles.content}>
                <Text style={styles.label}>
                    Replying to {replyTo.senderName || 'message'}
                </Text>
                <Text style={styles.message} numberOfLines={1}>
                    {replyTo.content}
                </Text>
            </View>
            <Pressable onPress={onCancel} style={styles.closeButton}>
                <X size={20} color="#666" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    bar: {
        width: 3,
        height: 40,
        backgroundColor: Colors.primary,
        borderRadius: 2,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
        color: '#666',
    },
    closeButton: {
        padding: 4,
        marginLeft: 8,
    },
});
