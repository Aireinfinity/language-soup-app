import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#1C1C1E',
    subtext: '#8E8E93',
};

export default function LanguageRequestModal({ visible, onClose, onSubmit }) {
    const [requestText, setRequestText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!requestText.trim()) return;

        setSubmitting(true);
        try {
            // Pass just the text - the handler will parse language/level
            await onSubmit(requestText, '');
            // Reset form
            setRequestText('');
        } catch (error) {
            console.error('Error submitting request:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.overlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Request a Group 🌍</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={SOUP_COLORS.text} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.content}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Instructions */}
                        <Text style={styles.instructions}>
                            What language group would you like to see? Let us know the language and level (e.g., "Spanish Intermediate" or "Korean Beginners")
                        </Text>

                        {/* Request Input */}
                        <Text style={styles.label}>
                            What language(s) do you want groups for?
                        </Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="E.g., Japanese Beginners, French Advanced..."
                            placeholderTextColor={SOUP_COLORS.subtext}
                            value={requestText}
                            onChangeText={setRequestText}
                            multiline
                            editable
                            maxLength={200}
                            numberOfLines={4}
                        />
                        <Text style={styles.charCount}>{requestText.length}/200</Text>
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable
                            onPress={onClose}
                            style={[styles.button, styles.cancelButton]}
                            disabled={submitting}
                        >
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            onPress={handleSubmit}
                            style={[
                                styles.button,
                                styles.submitButton,
                                (!requestText.trim() || submitting) && styles.submitButtonDisabled
                            ]}
                            disabled={!requestText.trim() || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>Submit Request</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 34,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.cream,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 20,
    },
    instructions: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
        lineHeight: 22,
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 8,
        marginTop: 8,
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: SOUP_COLORS.text,
        backgroundColor: SOUP_COLORS.cream,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        textAlign: 'right',
        marginTop: 4,
        marginBottom: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 16,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: SOUP_COLORS.cream,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    submitButton: {
        backgroundColor: SOUP_COLORS.blue,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
