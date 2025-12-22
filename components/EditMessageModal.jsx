import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Modal, Alert } from 'react-native';
import { BlurView } from 'expo-blur';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * EditMessageModal - Modal for editing text messages
 */
export function EditMessageModal({ visible, message, onClose, onSave }) {
    const [editedContent, setEditedContent] = useState(message?.content || '');

    const handleSave = () => {
        if (editedContent.trim()) {
            onSave(editedContent.trim());
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <BlurView intensity={20} tint="dark" style={styles.blurOverlay} />
            </Pressable>

            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Edit Message</Text>

                    <TextInput
                        style={styles.textInput}
                        value={editedContent}
                        onChangeText={setEditedContent}
                        multiline
                        autoFocus
                        placeholder="Type your message..."
                    />

                    <View style={styles.buttonRow}>
                        <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                            disabled={!editedContent.trim()}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    blurOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
        marginBottom: 16,
    },
    textInput: {
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        minHeight: 100,
        maxHeight: 200,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    saveButton: {
        backgroundColor: SOUP_COLORS.blue,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
