/**
 * Reusable "How levels work" sheet. Used from header (tap level) and can be used from profile.
 * When speakLevel/listenLevel are passed, shows dynamic progress bars at the top.
 */
import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

const MAX_LEVEL = 6;

function LevelBar({ level, emoji, label }) {
    const progress = Math.min(1, (level || 1) / MAX_LEVEL);
    return (
        <View style={styles.levelBarWrap}>
            <View style={styles.levelBarRow}>
                <Text style={styles.levelBarEmoji}>{emoji}</Text>
                <Text style={styles.levelBarLabel}>{label}</Text>
                <Text style={styles.levelBarNum}>Lv.{level || 1}</Text>
            </View>
            <View style={styles.levelBarTrack}>
                <View style={[styles.levelBarFill, { width: `${progress * 100}%` }]} />
            </View>
        </View>
    );
}

export function LevelsInfoSheet({ visible, onClose, speakLevel = 1, listenLevel = 1 }) {
    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Pressable style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </Pressable>
                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                        <Text style={styles.title}>talking with levels</Text>
                        <Text style={styles.intro}>
                            Your level goes up the more you speak. More voice messages = higher level.
                        </Text>
                        <View style={styles.dynamicBars}>
                            <LevelBar level={speakLevel} emoji="🎤" label="speak" />
                            <LevelBar level={listenLevel} emoji="👂" label="listen" />
                        </View>
                        <Text style={styles.dividerTitle}>how levels work</Text>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>🎤 Output (speaking)</Text>
                            <Text style={styles.sectionDesc}>Minutes of voice messages you've sent</Text>
                            <View style={styles.list}>
                                <Text style={styles.item}>Lv.1 🌱 First Words (0–30 min)</Text>
                                <Text style={styles.item}>Lv.2 🧱 Sentence Builder (30–120 min)</Text>
                                <Text style={styles.item}>Lv.3 💬 Conversation Starter (120–300 min)</Text>
                                <Text style={styles.item}>Lv.4 🍜 Daily Souper (300–600 min)</Text>
                                <Text style={styles.item}>Lv.5 🎙️ Fluent Rambler (600–1200 min)</Text>
                                <Text style={styles.item}>Lv.6 🌟 Native Vibes (1200+ min)</Text>
                            </View>
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>👂 Input (listening)</Text>
                            <Text style={styles.sectionDesc}>Estimated hours listening to others</Text>
                            <View style={styles.list}>
                                <Text style={styles.item}>Lv.1 👂 Ear Training (0–3 hrs)</Text>
                                <Text style={styles.item}>Lv.2 🎣 Word Catcher (3–10 hrs)</Text>
                                <Text style={styles.item}>Lv.3 👑 Context King (10–30 hrs)</Text>
                                <Text style={styles.item}>Lv.4 🧠 Comprehension Pro (30–100 hrs)</Text>
                                <Text style={styles.item}>Lv.5 🚀 Native Speed (100–300 hrs)</Text>
                                <Text style={styles.item}>Lv.6 🌍 Polyglot (300+ hrs)</Text>
                            </View>
                        </View>

                        <Text style={styles.footer}>You listen more than you speak, just like real life 🍜</Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
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
        maxHeight: '85%',
    },
    closeBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
        padding: 8,
    },
    closeBtnText: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
    },
    scroll: {
        paddingTop: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    intro: {
        fontSize: 14,
        color: SOUP_COLORS.text,
        lineHeight: 21,
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    sectionDesc: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
    },
    list: { gap: 6 },
    item: {
        fontSize: 13,
        color: SOUP_COLORS.text,
        paddingLeft: 8,
    },
    footer: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
        marginBottom: 24,
    },
    dynamicBars: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 14,
        gap: 14,
    },
    levelBarWrap: { marginBottom: 4 },
    levelBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    levelBarEmoji: { fontSize: 16 },
    levelBarLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    levelBarNum: {
        fontSize: 13,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
    },
    levelBarTrack: {
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
    },
    levelBarFill: {
        height: '100%',
        borderRadius: 5,
        backgroundColor: SOUP_COLORS.green,
    },
    dividerTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
        textAlign: 'center',
    },
});
