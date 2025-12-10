import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, Pressable, Switch, Alert, TouchableWithoutFeedback, Keyboard, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    inputBg: '#f8f9fa',
    border: '#e9ecef'
};

const STATUSES = [
    { id: 'new', label: 'Open' },
    { id: 'fixing', label: 'In Progress' },
    { id: 'fixed', label: 'Done' }
];

export default function TicketModal({ visible, onClose, message, ticketToEdit, onSuccess }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('bug');
    const [priority, setPriority] = useState('P2');
    const [status, setStatus] = useState('new');
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            if (ticketToEdit) {
                // Editing mode
                setTitle(ticketToEdit.title || '');
                setDescription(ticketToEdit.content || '');
                setCategory(ticketToEdit.category || 'bug');
                setPriority(ticketToEdit.priority || 'P2');
                setStatus(ticketToEdit.status || 'new');
                setIsPublic(ticketToEdit.public_visible || false);
            } else if (message) {
                // Convert message mode
                setTitle('');
                setDescription(message.content || '');
                setCategory('bug');
                setPriority('P2');
                setStatus('new');
                setIsPublic(false);
            } else {
                // Scratch mode
                setTitle('');
                setDescription('');
                setCategory('bug');
                setPriority('P2');
                setStatus('new');
                setIsPublic(false);
            }
        }
    }, [visible, message, ticketToEdit]);

    const PRIORITIES = [
        { id: 'P0', label: '🔥 Critical', color: '#ff4757' },
        { id: 'P1', label: '⚠️ High', color: '#ffa502' },
        { id: 'P2', label: '📝 Normal', color: '#2ed573' }
    ];

    const handleSave = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert('Missing Fields', 'Please add a title and description.');
            return;
        }

        setLoading(true);
        try {
            const ticketData = {
                title: title.trim(),
                content: description.trim(),
                category,
                priority,
                status,
                public_visible: isPublic,
                is_ticket: true
                // Removed updated_at to prevent crash if column missing
            };

            let error;

            if (ticketToEdit) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('app_support_messages')
                    .update(ticketData)
                    .eq('id', ticketToEdit.id);
                error = updateError;
            } else if (message) {
                // Convert existing message to ticket
                const { error: updateError } = await supabase
                    .from('app_support_messages')
                    .update(ticketData)
                    .eq('id', message.id);
                error = updateError;
            } else {
                // Create new ticket (from scratch)
                const { error: insertError } = await supabase
                    .from('app_support_messages')
                    .insert({
                        ...ticketData,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        from_admin: true
                    });
                error = insertError;
            }

            if (error) throw error;

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Error saving ticket:', err);
            Alert.alert('Error', 'Failed to save ticket');
        } finally {
            setLoading(false);
        }
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
                        {ticketToEdit ? 'Edit Ticket' : 'New Ticket'}
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
                        placeholder="Short summary..."
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
                        placeholder="Details..."
                        placeholderTextColor="#999"
                    />

                    {/* Categories and Priority */}
                    <View style={styles.row}>
                        <View style={styles.col}>
                            <Text style={styles.label}>Category</Text>
                            <View style={styles.pillContainer}>
                                {['bug', 'feature_request'].map(c => (
                                    <Pressable
                                        key={c}
                                        style={[
                                            styles.pill,
                                            category === c && { backgroundColor: SOUP_COLORS.blue }
                                        ]}
                                        onPress={() => setCategory(c)}
                                    >
                                        <Text style={[
                                            styles.pillText,
                                            category === c && styles.pillTextActive
                                        ]}>{c === 'bug' ? 'Bug' : 'Feature'}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.col}>
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
                    </View>

                    {/* Status */}
                    <Text style={styles.label}>Status</Text>
                    <View style={styles.statusRow}>
                        {STATUSES.map(s => (
                            <Pressable
                                key={s.id}
                                style={[
                                    styles.pill,
                                    status === s.id && { backgroundColor: SOUP_COLORS.blue },
                                    { marginRight: 8 }
                                ]}
                                onPress={() => setStatus(s.id)}
                            >
                                <Text style={[
                                    styles.pillText,
                                    status === s.id && styles.pillTextActive
                                ]}>{s.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Public Toggle */}
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.switchLabel}>Public Roadmap</Text>
                            <Text style={styles.switchSub}>Show this ticket to all users</Text>
                        </View>
                        <Switch
                            value={isPublic}
                            onValueChange={setIsPublic}
                            trackColor={{ false: '#767577', true: SOUP_COLORS.green }}
                        />
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>

                <View style={styles.footer}>
                    <Pressable
                        style={[styles.submitButton, loading && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        <Text style={styles.submitText}>
                            {loading ? 'Saving...' : 'Save Ticket'}
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function getPriorityColor(p) {
    switch (p) {
        case 'P0': return SOUP_COLORS.pink;
        case 'P1': return SOUP_COLORS.blue;
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
    closeButton: {
        padding: 4,
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
        height: 120,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    col: {
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
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
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
        flexWrap: 'wrap',
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
        backgroundColor: '#fff',
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
