import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#1C1C1E',
    subtext: '#8E8E93',
};

const AVAILABLE_LANGUAGES = [
    'Arabic',
    'Chinese (Mandarin)',
    'Chinese (Cantonese)',
    'Dutch',
    'French',
    'German',
    'Greek',
    'Hebrew',
    'Hindi',
    'Italian',
    'Japanese',
    'Korean',
    'Polish',
    'Portuguese',
    'Russian',
    'Spanish',
    'Swedish',
    'Thai',
    'Turkish',
    'Vietnamese',
    'Other'
];

export default function LanguageRequestModal({ visible, onClose, onSubmit }) {
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedLanguage) return;

        setSubmitting(true);
        try {
            await onSubmit(selectedLanguage, message);
            // Reset form
            setSelectedLanguage('');
            setMessage('');
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
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Request a Language 🌍</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color={SOUP_COLORS.text} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Instructions */}
                        <Text style={styles.instructions}>
                            Don't see the language you want to learn? Let us know and we'll do our best to add it!
                        </Text>

                        {/* Language Picker */}
                        <Text style={styles.label}>Select Language</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedLanguage}
                                onValueChange={(value) => setSelectedLanguage(value)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Choose a language..." value="" />
                                {AVAILABLE_LANGUAGES.map((lang) => (
                                    <Picker.Item key={lang} label={lang} value={lang} />
                                ))}
                            </Picker>
                        </View>

                        {/* Optional Message */}
                        <Text style={styles.label}>
                            Why would you like to learn this language? (Optional)
                        </Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="E.g., I'm planning to travel to Japan next year..."
                            placeholderTextColor={SOUP_COLORS.subtext}
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            maxLength={500}
                            numberOfLines={4}
                        />
                        <Text style={styles.charCount}>{message.length}/500</Text>
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
                                (!selectedLanguage || submitting) && styles.submitButtonDisabled
                            ]}
                            disabled={!selectedLanguage || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>Submit Request</Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
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
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#E5E5EA',
        borderRadius: 12,
        marginBottom: 20,
        backgroundColor: SOUP_COLORS.cream,
    },
    picker: {
        height: 50,
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
