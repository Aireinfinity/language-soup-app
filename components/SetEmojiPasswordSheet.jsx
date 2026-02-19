/**
 * In-app flow to set emoji password for users who don't have one.
 * Updates Supabase Auth password and app_users.emoji_password so they won't be
 * treated as a "ghost" if they ever create a new account with the same name.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldAlert } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const EMOJIS = [
    '😭', '🥳', '🤗', '🤯', '😚', '🤪', '🙀', '🌈', '😵‍💫', '🥹',
    '😰', '😍', '🫠', '🤩', '😘', '🍜', '😎', '🦄', '👑', '🇫🇷',
];

export default function SetEmojiPasswordSheet({ visible, onClose, onSuccess }) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!visible || !user?.id) return;
        (async () => {
            const { data } = await supabase
                .from('app_users')
                .select('display_name')
                .eq('id', user.id)
                .single();
            if (data?.display_name) setDisplayName(data.display_name.trim());
        })();
    }, [visible, user?.id]);

    const addEmoji = (emoji) => {
        if (password.length < 3) setPassword([...password, emoji]);
    };
    const removeEmoji = () => setPassword(password.slice(0, -1));

    const handleSubmit = async () => {
        if (password.length !== 3) {
            Alert.alert('Almost!', 'Pick exactly 3 emojis');
            return;
        }
        const targetName = displayName?.trim() || '';
        if (!targetName) {
            Alert.alert('Hmm', 'We need your display name to set the password. Try again in a sec.');
            return;
        }
        setLoading(true);
        try {
            const emojiStr = password.join('');
            const internalPassword = `soup_${emojiStr}_${targetName.length}`;

            const { error: authError } = await supabase.auth.updateUser({ password: internalPassword });
            if (authError) throw authError;

            const { error: profileError } = await supabase
                .from('app_users')
                .update({ emoji_password: emojiStr })
                .eq('id', user.id);
            if (profileError) throw profileError;

            Alert.alert(
                'saved! 🍲',
                `Your password is ${password.join(' ')}. Screenshot or write it down so you can get back in if you ever get logged out.`,
                [{ text: 'got it', onPress: () => { onSuccess?.(); onClose?.(); } }]
            );
        } catch (e) {
            console.error('Set emoji password failed:', e);
            Alert.alert('Oops', e.message || 'Something went wrong. Try again?');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <View style={styles.sheet}>
                    <View style={styles.iconRow}>
                        <ShieldAlert size={28} color="#856404" />
                    </View>
                    <Text style={styles.title}>secure your Soup</Text>
                    <Text style={styles.subtitle}>Pick 3 emojis as your password. If you ever get logged out, same name + same 3 emojis = you're back in.</Text>
                    <View style={styles.passwordDisplay}>
                        {[0, 1, 2].map((i) => (
                            <View key={i} style={styles.emojiSlot}>
                                <Text style={styles.emojiText}>{password[i] || ''}</Text>
                            </View>
                        ))}
                        {password.length > 0 && (
                            <Pressable style={styles.deleteBtn} onPress={removeEmoji} hitSlop={8}>
                                <Text style={styles.deleteBtnText}>⌫</Text>
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.grid}>
                        {EMOJIS.map((emoji) => (
                            <Pressable
                                key={emoji}
                                style={styles.emojiBtn}
                                onPress={() => addEmoji(emoji)}
                            >
                                <Text style={styles.gridEmojiText}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <Pressable
                        style={[styles.button, (password.length !== 3 || loading) && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={password.length !== 3 || loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>save password</Text>}
                    </Pressable>
                    <Pressable style={styles.dismissBtn} onPress={onClose}>
                        <Text style={styles.dismissText}>maybe later</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingBottom: 32,
        paddingTop: 20,
    },
    iconRow: {
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#856404',
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: '#636e72',
        textAlign: 'center',
        marginBottom: 16,
    },
    passwordDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        gap: 8,
    },
    emojiSlot: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFF3CD',
        borderWidth: 2,
        borderColor: '#FFEEBA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiText: {
        fontSize: 24,
    },
    deleteBtn: {
        padding: 8,
        marginLeft: 4,
    },
    deleteBtnText: {
        fontSize: 18,
        color: '#636e72',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    emojiBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#f1f3f4',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridEmojiText: {
        fontSize: 22,
    },
    button: {
        backgroundColor: '#856404',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    dismissBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    dismissText: {
        fontSize: 15,
        color: '#636e72',
    },
});
