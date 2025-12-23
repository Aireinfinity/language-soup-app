import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';

const DEFAULT_REACTIONS = ['❤️', '😂', '😮', '😭', '🥳'];

export function FloatingReactionPicker({ visible, onReact, onClose, isMe, message, onEdit, onDelete }) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    if (!visible) return null;

    const handleReaction = (emoji) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onReact(emoji);
        onClose();
        setShowEmojiPicker(false);
    };

    const handleReactButton = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowEmojiPicker(true);
    };

    const handleEdit = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onEdit && message) {
            onEdit(message);
        }
        onClose();
    };

    const handleDelete = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onDelete && message) {
            onDelete(message);
        }
        onClose();
    };

    const canEdit = isMe && message?.message_type === 'text';
    const canDelete = isMe;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                setShowEmojiPicker(false);
                onClose();
            }}
        >
            <Pressable
                style={styles.backdrop}
                onPress={() => {
                    setShowEmojiPicker(false);
                    onClose();
                }}
            />

            {showEmojiPicker ? (
                <View style={styles.emojiContainer}>
                    {DEFAULT_REACTIONS.map((emoji) => (
                        <Pressable
                            key={emoji}
                            style={styles.emojiButton}
                            onPress={() => handleReaction(emoji)}
                        >
                            <Text style={styles.emoji}>{emoji}</Text>
                        </Pressable>
                    ))}
                </View>
            ) : (
                <View style={styles.actionContainer}>
                    <Pressable style={styles.actionButton} onPress={handleReactButton}>
                        <Text style={styles.actionEmoji}>😍</Text>
                        <Text style={styles.actionLabel}>React</Text>
                    </Pressable>

                    {canEdit && (
                        <Pressable style={styles.actionButton} onPress={handleEdit}>
                            <Text style={styles.actionEmoji}>✏️</Text>
                            <Text style={styles.actionLabel}>Edit</Text>
                        </Pressable>
                    )}

                    {canDelete && (
                        <Pressable style={styles.actionButton} onPress={handleDelete}>
                            <Text style={styles.actionEmoji}>🗑️</Text>
                            <Text style={styles.actionLabel}>Delete</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    actionContainer: {
        position: 'absolute',
        top: '45%',
        alignSelf: 'center',
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        gap: 8,
    },
    actionButton: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    actionEmoji: {
        fontSize: 28,
        marginBottom: 4,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    emojiContainer: {
        position: 'absolute',
        top: '45%',
        alignSelf: 'center',
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingVertical: 8,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
        gap: 4,
    },
    emojiButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 24,
    },
});
