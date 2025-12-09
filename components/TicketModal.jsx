import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, Pressable, Switch, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Check } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
    green: '#34C759',
    red: '#FF3B30',
    yellow: '#FFCC00',
};

const DEFAULT_DESCRIPTION = `**Issue:**
[Description]

**Steps to Reproduce:**
1. 
2. 

**Expected Behavior:**
[Details]`;

export default function TicketModal({ visible, onClose, onSubmit, initialData }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
    const [priority, setPriority] = useState('P1'); // P0, P1, P2
    const [category, setCategory] = useState('bug'); // bug, feature_request
    const [publicVisible, setPublicVisible] = useState(false);
    const [status, setStatus] = useState('new');

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setTitle(initialData.title || '');
                setDescription(initialData.content || DEFAULT_DESCRIPTION);
                setPriority(initialData.priority || 'P1');
                setCategory(initialData.category || 'bug');
                setPublicVisible(initialData.public_visible || false);
                setStatus(initialData.status || 'new');
            } else {
                setTitle('');
                setDescription(DEFAULT_DESCRIPTION);
                setPriority('P1');
                setCategory('bug');
                setPublicVisible(false);
                setStatus('new');
            }
        }
    }, [visible, initialData]);

    const handleSubmit = () => {
        onSubmit({
            title,
            content: description,
            priority,
            category,
            public_visible: publicVisible,
            status
        });
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>
                        {initialData ? 'Edit Ticket' : 'New Ticket'}
                    </Text>
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#000" />
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {/* Title */}
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Short summary of the issue"
                        placeholderTextColor="#999"
                    />

                    {/* Description */}
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                        placeholder="Detailed description..."
                    />

                    {/* Meta Fields Row */}
                    <View style={styles.row}>
                        {/* Priority */}
                        <View style={styles.halfCol}>
                            <Text style={styles.label}>Priority</Text>
                            <View style={styles.pillContainer}>
                                {['P0', 'P1', 'P2'].map(p => (
                                    <Pressable
                                        key={p}
                                        style={[
                                            styles.pill,
                                            priority === p && { backgroundColor: getPriorityColor(p) }
                                        ]}
                                        onPress={() => setPriority(p)}
                                    >
                                        <Text style={[
                                            styles.pillText,
                                            priority === p && styles.pillTextActive
                                        ]}>{p}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Category */}
                        <View style={styles.halfCol}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.pillContainer}>
                                {['bug', 'feature_request'].map(c => (
                                    <Pressable
                                        key={c}
                                        style={[
                                            styles.pill,
                                            category === c && styles.pillActiveBlue
                                        ]}
                                        onPress={() => setCategory(c)}
                                    >
                                        <Text style={[
                                            styles.pillText,
                                            category === c && styles.pillTextActive
                                        ]}>{c === 'feature_request' ? 'Req' : 'Bug'}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Status */}
                    <Text style={styles.label}>Status</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusRow}>
                        {['new', 'investigating', 'fixing', 'fixed'].map(s => (
                            <Pressable
                                key={s}
                                style={[
                                    styles.pill,
                                    status === s && styles.pillActiveBlue,
                                    { marginRight: 8 }
                                ]}
                                onPress={() => setStatus(s)}
                            >
                                <Text style={[
                                    styles.pillText,
                                    status === s && styles.pillTextActive
                                ]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Public Visibility */}
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.switchLabel}>Public Roadmap</Text>
                            <Text style={styles.switchSub}>Show in "Bugs we're working on"</Text>
                        </View>
                        <Switch
                            value={publicVisible}
                            onValueChange={setPublicVisible}
                            trackColor={{ false: '#767577', true: SOUP_COLORS.green }}
                        />
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>

                <View style={styles.footer}>
                    <Pressable style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitText}>Save Ticket</Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function getPriorityColor(p) {
    switch (p) {
        case 'P0': return SOUP_COLORS.red;
        case 'P1': return SOUP_COLORS.yellow;
        case 'P2': return SOUP_COLORS.green;
        default: return '#ccc';
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 150,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    halfCol: {
        flex: 1,
    },
    pillContainer: {
        flexDirection: 'row',
        backgroundColor: '#F2F2F7',
        borderRadius: 8,
        padding: 2,
    },
    pill: {
        flex: 1,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pillActiveBlue: {
        backgroundColor: SOUP_COLORS.blue,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    pillTextActive: {
        color: '#fff',
    },
    statusRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        padding: 16,
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    switchSub: {
        fontSize: 12,
        color: '#999',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    submitButton: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
