import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

/**
 * GroupSelectorModal - Modal for selecting groups when promoting to CM
 */
export function GroupSelectorModal({ visible, groups, selectedGroups, onToggleGroup, onSave, onClose }) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Groups to Manage</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={24} color="#000" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.groupsList}>
                        {groups.map((group) => {
                            const isSelected = selectedGroups.includes(group.id);
                            return (
                                <Pressable
                                    key={group.id}
                                    style={[styles.groupItem, isSelected && styles.groupItemSelected]}
                                    onPress={() => onToggleGroup(group.id)}
                                >
                                    <Text style={[styles.groupText, isSelected && styles.groupTextSelected]}>
                                        {group.language}
                                    </Text>
                                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable style={styles.saveButton} onPress={onSave}>
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
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    closeButton: {
        padding: 4,
    },
    groupsList: {
        maxHeight: 400,
    },
    groupItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    groupItemSelected: {
        backgroundColor: SOUP_COLORS.cream,
    },
    groupText: {
        fontSize: 16,
        color: '#000',
    },
    groupTextSelected: {
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    checkmark: {
        fontSize: 20,
        color: SOUP_COLORS.blue,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    saveButton: {
        backgroundColor: SOUP_COLORS.blue,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
    },
});
