import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { ShieldAlert, ArrowRight } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SetEmojiPasswordSheet from './SetEmojiPasswordSheet';

export const SecurityBanner = () => {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false);
    const [showSetPassword, setShowSetPassword] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        if (!user) return;

        const checkSecurity = async () => {
            const { data } = await supabase
                .from('app_users')
                .select('emoji_password')
                .eq('id', user.id)
                .single();

            if (data && !data.emoji_password) {
                setVisible(true);
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            } else {
                setVisible(false);
            }
        };

        checkSecurity();
    }, [user]);

    const handleSuccess = () => {
        setVisible(false);
        setShowSetPassword(false);
    };

    if (!visible) return null;

    return (
        <>
            <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                <Pressable
                    style={styles.content}
                    onPress={() => setShowSetPassword(true)}
                >
                    <View style={styles.iconCircle}>
                        <ShieldAlert size={20} color="#856404" />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Secure your Soup! 🍲</Text>
                        <Text style={styles.subtitle}>Set an emoji password so you never lose access (same name + same 3 emojis = you're back in).</Text>
                    </View>
                    <ArrowRight size={20} color="#856404" />
                </Pressable>
            </Animated.View>
            <SetEmojiPasswordSheet
                visible={showSetPassword}
                onClose={() => setShowSetPassword(false)}
                onSuccess={handleSuccess}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3CD',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFEEBA',
        gap: 12,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFEEBA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#856404',
    },
    subtitle: {
        fontSize: 13,
        color: '#856404',
        opacity: 0.9,
    },
});
