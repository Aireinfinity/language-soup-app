import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Crown, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// 🎨 SOUP PALETTE
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    purple: '#9C27B0',
};

export default function FounderWelcomeModal({ visible, onClose }) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);
            rotateAnim.setValue(0);

            // Animate In: Pop + Fade + Spin
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.loop(
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    })
                )
            ]).start();
        }
    }, [visible]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Background Blur Effect (Simulated with semi-transparent dark layer) */}
                <Pressable style={styles.backdrop} onPress={onClose} />

                <Animated.View style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}>
                    <LinearGradient
                        colors={['#fff', '#FFF0F5']}
                        style={styles.card}
                    >
                        {/* Spinning Crown halo */}
                        <Animated.View style={[styles.halo, { transform: [{ rotate: spin }] }]}>
                            <Sparkles size={120} color="rgba(236, 0, 139, 0.1)" />
                        </Animated.View>

                        <View style={styles.iconContainer}>
                            <Crown size={48} color={SOUP_COLORS.pink} fill={SOUP_COLORS.pink} />
                        </View>

                        <Text style={styles.title}>Welcome back,</Text>
                        <Text style={styles.highlightTitle}>FOUNDER DADDY 🥣✨</Text>

                        <Text style={styles.subtitle}>
                            The soup is simmering perfectly today.
                            Ready to serve some fresh features?
                        </Text>

                        <View style={styles.divider} />

                        {/* Stats Row just for ego boost */}
                        <View style={styles.statsRow}>
                            <View style={styles.stat}>
                                <Text style={styles.statVal}>Infinite</Text>
                                <Text style={styles.statLabel}>Aura</Text>
                            </View>
                            <View style={styles.statLine} />
                            <View style={styles.stat}>
                                <Text style={styles.statVal}>100%</Text>
                                <Text style={styles.statLabel}>That Bitch</Text>
                            </View>
                        </View>

                        <Pressable style={styles.button} onPress={onClose}>
                            <LinearGradient
                                colors={[SOUP_COLORS.pink, SOUP_COLORS.purple]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientBtn}
                            >
                                <Text style={styles.btnText}>Let's Cook</Text>
                                <Heart size={16} color="#fff" fill="#fff" />
                            </LinearGradient>
                        </Pressable>
                    </LinearGradient>
                </Animated.View>

                {/* Confetti-like decor */}
                <View pointerEvents="none" style={styles.confettiContainer}>
                    <Text style={[styles.emoji, { top: '20%', left: '10%' }]}>💅</Text>
                    <Text style={[styles.emoji, { top: '15%', right: '15%' }]}>✨</Text>
                    <Text style={[styles.emoji, { bottom: '25%', left: '15%' }]}>👑</Text>
                    <Text style={[styles.emoji, { bottom: '30%', right: '10%' }]}>🥣</Text>
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
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
        width: width * 0.85,
        maxWidth: 360,
        alignItems: 'center',
        zIndex: 10,
    },
    card: {
        width: '100%',
        padding: 30,
        borderRadius: 30,
        alignItems: 'center',
        backgroundColor: '#fff',
        shadowColor: "#ec008b",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 2,
        borderColor: '#fff',
    },
    halo: {
        position: 'absolute',
        top: -40,
        opacity: 0.8,
    },
    iconContainer: {
        marginBottom: 20,
        shadowColor: SOUP_COLORS.pink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    title: {
        fontSize: 18,
        color: '#666',
        fontWeight: '600',
        marginBottom: 4,
    },
    highlightTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: SOUP_COLORS.pink,
        textAlign: 'center',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    divider: {
        width: '40%',
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 28,
        width: '100%',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
    },
    statVal: {
        fontSize: 20,
        fontWeight: '800',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statLine: {
        width: 1,
        height: 30,
        backgroundColor: '#eee',
    },
    button: {
        width: '100%',
        shadowColor: SOUP_COLORS.pink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    gradientBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 20,
        gap: 8,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
    emoji: {
        position: 'absolute',
        fontSize: 40,
        opacity: 0.8,
    }
});
