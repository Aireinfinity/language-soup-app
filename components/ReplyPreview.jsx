import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Reply } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#1C1C1E',
    subtext: '#8E8E93',
    cardBg: '#FFFFFF',
};

/**
 * ReplyPreview Component
 * Displays a compact preview of the message being replied to
 * Shows sender name, avatar, and truncated message content
 */
export function ReplyPreview({ replyToMessage, isMe, onPress }) {
    if (!replyToMessage) return null;

    const truncateText = (text, maxLength = 50) => {
        if (!text) return '';
        return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    };

    const getPreviewContent = () => {
        if (replyToMessage.message_type === 'voice') {
            return '🎤 Voice message';
        }
        return truncateText(replyToMessage.content);
    };

    return (
        <Pressable
            style={[
                styles.container,
                isMe ? styles.containerMe : styles.containerThem
            ]}
            onPress={onPress}
        >
            <View style={[
                styles.accentBar,
                isMe ? styles.accentBarMe : styles.accentBarThem
            ]} />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Reply size={12} color={SOUP_COLORS.subtext} />
                    <Text style={styles.senderName}>
                        {replyToMessage.sender?.display_name || 'Unknown'}
                    </Text>
                </View>
                <Text style={styles.messagePreview} numberOfLines={1}>
                    {getPreviewContent()}
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 8,
        marginBottom: 6,
        overflow: 'hidden',
        maxWidth: '85%',
    },
    containerMe: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    containerThem: {
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    accentBar: {
        width: 3,
        backgroundColor: SOUP_COLORS.blue,
    },
    accentBarMe: {
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    accentBarThem: {
        backgroundColor: SOUP_COLORS.blue,
    },
    content: {
        flex: 1,
        padding: 8,
        paddingLeft: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    senderName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
    },
    messagePreview: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontWeight: '500',
    },
});
