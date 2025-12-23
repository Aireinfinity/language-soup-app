import React, { useState } from 'react';
import { View, Image, StyleSheet, Pressable, Text, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Video } from 'expo-av';
import { X, Send } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
};

export function ImagePreview({ visible, imageUri, mediaType = 'image', onSend, onCancel }) {
    const [isSending, setIsSending] = useState(false);
    const [caption, setCaption] = useState('');

    if (!visible || !imageUri) return null;

    const handleSend = async () => {
        if (isSending) return; // Prevent double-tap
        setIsSending(true);
        try {
            await onSend(caption);
            setCaption(''); // Clear caption after sending
        } finally {
            setIsSending(false);
        }
    };

    const handleCancel = () => {
        setCaption(''); // Clear caption on cancel
        onCancel();
    };

    const isVideo = mediaType === 'video' || imageUri.toLowerCase().match(/\.(mp4|mov|m4v)$/);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleCancel}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <BlurView intensity={95} tint="dark" style={styles.blur}>
                    {/* Header with cancel button */}
                    <View style={styles.header}>
                        <Pressable onPress={handleCancel} style={styles.cancelButton} disabled={isSending}>
                            <X size={28} color="#fff" />
                        </Pressable>
                    </View>

                    {/* Media preview */}
                    <View style={styles.imageContainer}>
                        {isVideo ? (
                            <Video
                                source={{ uri: imageUri }}
                                style={styles.image}
                                useNativeControls
                                resizeMode="contain"
                                shouldPlay={false}
                            />
                        ) : (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        )}
                    </View>

                    {/* Caption input */}
                    <View style={styles.captionContainer}>
                        <TextInput
                            style={styles.captionInput}
                            placeholder="Add a caption..."
                            placeholderTextColor="rgba(255,255,255,0.6)"
                            value={caption}
                            onChangeText={setCaption}
                            multiline
                            maxLength={200}
                            editable={!isSending}
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
            </KeyboardAvoidingView>
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
    captionContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    captionInput: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 16,
        maxHeight: 100,
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
