import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

function formatListeningTime(seconds) {
    if (seconds == null || seconds < 0) return '0 min';
    const totalM = Math.floor(seconds / 60);
    if (totalM >= 60) {
        const h = Math.floor(totalM / 60);
        const m = totalM % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return totalM === 0 ? '< 1 min' : `${totalM} min`;
}

export function PodcastEndSummary() {
    const insets = useSafeAreaInsets();
    const { showEndSummary, setShowEndSummary, endSummaryStats } = useAudioPlayer();

    if (!showEndSummary) return null;

    const todaySeconds = endSummaryStats?.todaySeconds ?? 0;
    const totalSeconds = endSummaryStats?.totalSeconds ?? 0;

    return (
        <Modal
            visible={showEndSummary}
            transparent
            animationType="fade"
            onRequestClose={() => setShowEndSummary(false)}
        >
            <Pressable
                style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
                onPress={() => setShowEndSummary(false)}
            >
                <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <Text style={styles.title}>You're all caught up</Text>
                        <Pressable
                            onPress={() => setShowEndSummary(false)}
                            hitSlop={12}
                            style={styles.closeBtn}
                        >
                            <X size={24} color={SOUP_COLORS.text} strokeWidth={2} />
                        </Pressable>
                    </View>
                    <Text style={styles.subtitle}>Here's your listening today</Text>
                    <View style={styles.row}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatListeningTime(todaySeconds)}</Text>
                            <Text style={styles.statLabel}>listened today</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{formatListeningTime(totalSeconds)}</Text>
                            <Text style={styles.statLabel}>total listened</Text>
                        </View>
                    </View>
                    <Pressable
                        style={styles.doneBtn}
                        onPress={() => setShowEndSummary(false)}
                    >
                        <Text style={styles.doneBtnText}>Done</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 20,
        padding: 24,
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.green,
        borderRightWidth: 3,
        borderRightColor: SOUP_COLORS.blue,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    closeBtn: {
        padding: 4,
    },
    subtitle: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
        marginBottom: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    statLabel: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        marginTop: 4,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.08)',
    },
    doneBtn: {
        backgroundColor: SOUP_COLORS.blue,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    doneBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
});
