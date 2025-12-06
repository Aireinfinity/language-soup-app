import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { X } from 'lucide-react-native';

const SOUP_COLORS = {
    text: '#2d3436',
    textLight: '#636e72',
};

export function ReactionDetailsModal({ visible, onClose, reactions, messageId }) {
    if (!reactions || reactions.length === 0) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Reactions</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={20} color={SOUP_COLORS.text} />
                        </Pressable>
                    </View>

                    {reactions.map((reaction, idx) => (
                        <View key={idx} style={styles.reactionGroup}>
                            <Text style={styles.emoji}>{reaction.emoji}</Text>
                            <View style={styles.usersList}>
                                {reaction.users.map((userName, userIdx) => (
                                    <Text key={userIdx} style={styles.userName}>
                                        {userName}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        maxHeight: '60%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    reactionGroup: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    emoji: {
        fontSize: 24,
    },
    usersList: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
});
