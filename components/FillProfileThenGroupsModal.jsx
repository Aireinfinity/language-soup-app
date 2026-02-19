/**
 * Shown when user tries to send but profile or groups are incomplete.
 * Step 1: fill profile (photo, name, tagline, bio, languages). Step 2: pick groups.
 * They open profile and groups screens, then tap Done; parent auto-sends when complete.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { haptics } from '../utils/haptics';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

export function FillProfileThenGroupsModal({ visible, onClose, onComplete }) {
    const router = useRouter();

    const openProfile = () => {
        try { haptics.light(); } catch (_) {}
        router.push('/profile-modal');
    };

    const openGroups = () => {
        try { haptics.light(); } catch (_) {}
        router.push('/browse-groups');
    };

    const handleDone = () => {
        try { haptics.light(); } catch (_) {}
        onComplete();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                        <X size={24} color={SOUP_COLORS.text} strokeWidth={2} />
                    </Pressable>
                    <Text style={styles.title}>fill your profile first</Text>
                    <Text style={styles.sub}>
                        add a photo, name, tagline, and languages, then pick at least one group. then you can send.
                    </Text>
                    <View style={styles.actions}>
                        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={openProfile}>
                            <Text style={styles.btnText}>edit profile</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]} onPress={openGroups}>
                            <Text style={styles.btnText}>pick groups</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]} onPress={handleDone}>
                            <Text style={styles.btnPrimaryText}>done, send my message</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 20,
        padding: 24,
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
        zIndex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 8,
    },
    sub: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
        lineHeight: 22,
        marginBottom: 24,
    },
    actions: {
        gap: 12,
    },
    btn: {
        backgroundColor: 'rgba(0,173,239,0.15)',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    btnPrimary: {
        backgroundColor: SOUP_COLORS.turquoise,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    btnText: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.turquoise,
    },
    btnPrimaryText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    btnPressed: {
        opacity: 0.85,
    },
});
