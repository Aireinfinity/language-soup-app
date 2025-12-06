import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Linking } from 'react-native';
import { Mail, MessageCircle } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

const LANGUAGE_FLAGS = {
    'French': '🇫🇷',
    'Spanish': '🇪🇸',
    'Japanese': '🇯🇵',
    'German': '🇩🇪',
    'Italian': '🇮🇹',
    'Portuguese': '🇵🇹',
    'Chinese': '🇨🇳',
    'Korean': '🇰🇷',
};

export default function SpeakerCard({ speaker }) {
    const handleEmail = () => {
        if (speaker.contact_email) {
            Linking.openURL(`mailto:${speaker.contact_email}?subject=Language Practice Session`);
        }
    };

    const handleWhatsApp = () => {
        if (speaker.whatsapp_number) {
            const message = encodeURIComponent("Hi! I'd like to practice French with you.");
            Linking.openURL(`https://wa.me/${speaker.whatsapp_number.replace(/\D/g, '')}?text=${message}`);
        }
    };

    const getLanguageFlags = () => {
        return speaker.languages.map(lang => LANGUAGE_FLAGS[lang] || '🌍').join(' ');
    };

    return (
        <View style={styles.card}>
            {/* Avatar & Info */}
            <View style={styles.header}>
                {speaker.photo_url ? (
                    <Image source={{ uri: speaker.photo_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                            {speaker.display_name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}

                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{speaker.display_name}</Text>
                        <Text style={styles.flags}>{getLanguageFlags()}</Text>
                    </View>
                    <Text style={styles.languages}>
                        {speaker.languages.join(' • ')}
                    </Text>
                    {speaker.availability && (
                        <Text style={styles.availability}>📅 {speaker.availability}</Text>
                    )}
                </View>
            </View>

            {/* Bio */}
            {speaker.bio && (
                <Text style={styles.bio} numberOfLines={3}>
                    {speaker.bio}
                </Text>
            )}

            {/* Contact Buttons */}
            <View style={styles.actions}>
                {speaker.whatsapp_number && (
                    <Pressable
                        style={[styles.button, styles.whatsappButton]}
                        onPress={handleWhatsApp}
                    >
                        <MessageCircle size={18} color="#fff" />
                        <Text style={styles.buttonText}>Chat on WhatsApp</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginRight: 8,
    },
    flags: {
        fontSize: 16,
    },
    languages: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontWeight: '500',
    },
    availability: {
        fontSize: 13,
        color: SOUP_COLORS.green,
        fontWeight: '600',
        marginTop: 4,
    },
    bio: {
        fontSize: 14,
        color: SOUP_COLORS.text,
        lineHeight: 20,
        marginBottom: 16,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    whatsappButton: {
        backgroundColor: '#25D366',
    },
    emailButton: {
        backgroundColor: SOUP_COLORS.blue,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
