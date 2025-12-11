import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';

export default function AdminLoginModal({ visible, onClose, onSuccess }) {
    const [password, setPassword] = useState('');

    const handleSubmit = () => {
        // Simple hardcoded password - replace with secure method later
        if (password === 'admin123') {
            onSuccess();
            setPassword('');
            onClose();
        } else {
            Alert.alert('❌', 'Incorrect password');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>Admin Access</Text>
                    <TextInput
                        placeholder="Enter admin password"
                        placeholderTextColor="#aaa"
                        secureTextEntry
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <Pressable style={styles.button} onPress={handleSubmit}>
                        <Text style={styles.buttonText}>Unlock</Text>
                    </Pressable>
                    <Pressable style={styles.cancel} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '80%',
        backgroundColor: '#222',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        color: '#fff',
        marginBottom: 12,
    },
    input: {
        width: '100%',
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#0066ff',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    buttonText: { color: '#fff', fontWeight: '600' },
    cancel: { padding: 4 },
    cancelText: { color: '#aaa' },
});
