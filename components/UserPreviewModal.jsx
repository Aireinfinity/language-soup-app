import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Modal, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import { getLanguageFlag } from '../utils/languageFlags';
import { getAvatarSource } from '../utils/soupUtils';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

export function UserPreviewModal({ visible, user, onClose }) {
    if (!user) return null;

    // Defensive access to user properties to prevent crashes
    const displayName = user?.display_name || 'Anonymous';
    const avatarUrl = user?.avatar_url;
    const statusText = user?.status_text;
    const initial = displayName?.[0]?.toUpperCase() || '?';
    const handleSendMessage = () => {
        Alert.alert(
            'Coming Soon! 💬',
            'Direct messaging will be available soon. Stay tuned!',
            [{ text: 'OK' }]
        );
    };

    // Get all language flags
    const learningLanguages = user.learning_languages || [];
    const fluentLanguages = user.fluent_languages || [];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    {/* Close button */}
                    <Pressable onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#666" />
                    </Pressable>

                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {user.avatar_url ? (
                            <Image
                                source={getAvatarSource(user.avatar_url)}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitial}>
                                    {user.display_name?.[0]?.toUpperCase() || '?'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Name */}
                    <Text style={styles.name}>{user.display_name || 'Anonymous'}</Text>

                    {/* Tagline */}
                    {user.status_text && (
                        <Text style={styles.tagline}>"{user.status_text}"</Text>
                    )}

                    {/* Languages */}
                    <View style={styles.languagesContainer}>
                        {learningLanguages.length > 0 && (
                            <View style={styles.languageSection}>
                                <Text style={styles.languageLabel}>Learning</Text>
                                <View style={styles.flagRow}>
                                    {learningLanguages.map((lang, i) => (
                                        <Text key={i} style={styles.flag}>
                                            {getLanguageFlag(lang)}
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        )}

                        {fluentLanguages.length > 0 && (
                            <View style={styles.languageSection}>
                                <Text style={styles.languageLabel}>Fluent</Text>
                                <View style={styles.flagRow}>
                                    {fluentLanguages.map((lang, i) => (
                                        <Text key={i} style={styles.flag}>
                                            {getLanguageFlag(lang)}
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Send Message Button */}
                    <Pressable
                        style={styles.messageButton}
                        onPress={handleSendMessage}
                    >
                        <Text style={styles.messageButtonText}>Send Message</Text>
                    </Pressable>
                </Pressable>
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
        padding: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    avatarContainer: {
        marginBottom: 16,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: SOUP_COLORS.cream,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: SOUP_COLORS.cream,
    },
    avatarInitial: {
        fontSize: 48,
        fontWeight: '700',
        color: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2d3436',
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        fontStyle: 'italic',
        color: '#636e72',
        textAlign: 'center',
        marginBottom: 20,
    },
    languagesContainer: {
        width: '100%',
        marginBottom: 20,
    },
    languageSection: {
        marginBottom: 12,
    },
    languageLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#636e72',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    flagRow: {
        flexDirection: 'row',
        gap: 8,
    },
    flag: {
        fontSize: 24,
    },
    messageButton: {
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 24,
        width: '100%',
        alignItems: 'center',
    },
    messageButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
