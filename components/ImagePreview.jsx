import React, { useState } from 'react';
import { View, Image, StyleSheet, Pressable, Text, Modal, ActivityIndicator } from 'react-native';
import { X, Send } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
};

export function ImagePreview({ visible, imageUri, onSend, onCancel }) {
    const [isSending, setIsSending] = useState(false);

    if (!visible || !imageUri) return null;

    const handleSend = async () => {
        if (isSending) return; // Prevent double-tap
        setIsSending(true);
        try {
            await onSend();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.container}>
                <BlurView intensity={95} tint="dark" style={styles.blur}>
                    {/* Header with cancel button */}
                    <View style={styles.header}>
                        <Pressable onPress={onCancel} style={styles.cancelButton} disabled={isSending}>
                            <X size={28} color="#fff" />
                        </Pressable>
                    </View>

                    {/* Image preview */}
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUri }}
                            style={styles.image}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Footer with send button */}
                    <View style={styles.footer}>
                        <Pressable
                            onPress={handleSend}
                            style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                            disabled={isSending}
                        >
                            {isSending ? (
                                <>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.sendText}>Sending...</Text>
                                </>
                            ) : (
                                <>
                                    <Send size={24} color="#fff" />
                                    <Text style={styles.sendText}>Send</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    blur: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    cancelButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    image: {
        width: '100%',
        height: '100%',
        maxHeight: 500,
    },
    footer: {
        paddingBottom: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
