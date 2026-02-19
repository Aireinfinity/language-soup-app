/**
 * ChatInputBar – WhatsApp-style: attach (left), input (center), mic or send (right). Brand blue for actions.
 */
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Send, Mic, Paperclip, Trash2, Play, Pause, Square } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { LiveAudioWaveform } from './LiveAudioWaveform';
import { haptics } from '../utils/haptics';

const BAR_BG = '#F0F2F5';
const INPUT_BG = '#fff';
const GREEN_BAR = '#19b091';
const CREAM_BAR = '#FDF5E6';
const INPUT_RADIUS = 20;
const BTN_SIZE = 44;
const PRESS = 0.82;
const PREVIEW_BARS = 24;

function PreviewWaveform({ progress }) {
    const heights = React.useMemo(() => {
        return Array.from({ length: PREVIEW_BARS }, (_, i) => {
            const t = (i / PREVIEW_BARS) * Math.PI * 3;
            return 0.2 + 0.6 * (Math.sin(t) * 0.5 + 0.5);
        });
    }, []);
    return (
        <View style={previewWaveformStyles.wrap}>
            {heights.map((h, i) => {
                const barPos = i / PREVIEW_BARS;
                const filled = progress >= barPos;
                return (
                    <View
                        key={i}
                        style={[
                            previewWaveformStyles.bar,
                            { height: 4 + h * 20, backgroundColor: filled ? Colors.primary : 'rgba(0,0,0,0.12)' },
                        ]}
                    />
                );
            })}
        </View>
    );
}

const previewWaveformStyles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        flex: 1,
        minWidth: 0,
        height: 28,
    },
    bar: {
        width: 2.5,
        borderRadius: 1.5,
    },
});

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function ChatInputBar({
    value,
    onChangeText,
    onSendText,
    sending,
    placeholder = 'Tap mic or type...',
    isEditing = false,
    onPhotoPress,
    onStartRecording,
    isRecording = false,
    recordingDuration = 0,
    metering = -160,
    onCancelRecording,
    onSendRecording,
    previewAudio = null,
    isPlayingPreview = false,
    previewPosition = 0,
    onTogglePreview,
    onDiscardPreview,
    onConfirmSend,
    theme,
}) {
    const insets = useSafeAreaInsets();
    const paddingBottom = Math.max(insets.bottom, 10);
    const hasText = (value || '').trim().length > 0;
    const showRecording = isRecording || previewAudio;
    const useGreenBar = theme === 'green';
    const useCreamGreen = theme === 'creamGreen';

    const onHaptic = () => { try { haptics.light(); } catch (_) {} };
    const onSend = () => {
        const t = (value || '').trim();
        if (!t || sending) return;
        onSendText?.(t);
    };

    return (
        <View style={[styles.bar, useGreenBar && styles.barGreen, useCreamGreen && styles.barCreamGreen, showRecording && styles.barRecording, { paddingBottom }]}>
            {showRecording ? (
                <View style={styles.recordBlock}>
                    {previewAudio ? (
                        <View style={styles.waveformTopRow}>
                            <Pressable onPress={() => { onHaptic(); onTogglePreview?.(); }} style={({ pressed }) => [styles.recordBtn, pressed && { opacity: PRESS }]}>
                                {isPlayingPreview ? <Pause size={24} color={Colors.primary} /> : <Play size={24} color={Colors.primary} />}
                            </Pressable>
                            <View style={styles.waveformFull}>
                                <PreviewWaveform progress={previewPosition || 0} />
                            </View>
                            <Text style={styles.timerText}>{formatTime(previewAudio.duration)}</Text>
                        </View>
                    ) : (
                        <View style={styles.waveformTopRow}>
                            <View style={styles.waveformFull}>
                                <LiveAudioWaveform metering={metering} recordingDuration={recordingDuration} isRecording={isRecording} />
                            </View>
                        </View>
                    )}
                    <View style={styles.recordControlsRow}>
                        {!previewAudio && <View style={styles.redDot} />}
                        <Text style={styles.timerText}>{previewAudio ? formatTime(previewAudio.duration) : formatTime(recordingDuration)}</Text>
                        <View style={styles.recordControlsSpacer} />
                        <Pressable onPress={() => { onHaptic(); (previewAudio ? onDiscardPreview : onCancelRecording)?.(); }} style={({ pressed }) => [styles.recordBtn, pressed && { opacity: PRESS }]}>
                            <Trash2 size={22} color="#667781" />
                        </Pressable>
                        <Pressable
                            onPress={() => { onHaptic(); (previewAudio ? onConfirmSend : onSendRecording)?.(); try { haptics.success(); } catch (_) {} }}
                            style={({ pressed }) => [styles.actionBtn, (useGreenBar || useCreamGreen) && styles.actionBtnOnGreen, pressed && { opacity: PRESS }]}
                        >
                            {previewAudio ? <Send size={22} color={(useGreenBar || useCreamGreen) ? GREEN_BAR : '#fff'} /> : <Square size={20} color={(useGreenBar || useCreamGreen) ? GREEN_BAR : '#fff'} fill={(useGreenBar || useCreamGreen) ? GREEN_BAR : '#fff'} />}
                        </Pressable>
                    </View>
                </View>
            ) : (
                <View style={styles.idleRow}>
                    <Pressable onPress={() => { onHaptic(); onPhotoPress?.(); }} style={({ pressed }) => [styles.attachBtn, pressed && { opacity: PRESS }]}>
                        <Paperclip size={24} color="#54656F" />
                    </Pressable>
                    <TextInput
                        style={[styles.input, isEditing && styles.inputEditing]}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor="#667781"
                        multiline
                        maxLength={500}
                        editable={!sending}
                    />
                    {hasText ? (
                        <Pressable
                            onPress={() => { onHaptic(); onSend(); }}
                            disabled={sending}
                            style={({ pressed }) => [styles.actionBtn, (useGreenBar || useCreamGreen) && styles.actionBtnOnGreen, sending && styles.actionBtnDisabled, pressed && !sending && { opacity: PRESS }]}
                        >
                            <Send size={22} color={(useGreenBar || useCreamGreen) ? GREEN_BAR : '#fff'} />
                        </Pressable>
                    ) : (
                        <Pressable onPress={() => { onHaptic(); onStartRecording?.(); }} style={({ pressed }) => [styles.actionBtn, (useGreenBar || useCreamGreen) && styles.actionBtnOnGreen, pressed && { opacity: PRESS }]}>
                            <Mic size={22} color={(useGreenBar || useCreamGreen) ? GREEN_BAR : '#fff'} />
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: BAR_BG,
        paddingHorizontal: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    barGreen: {
        backgroundColor: GREEN_BAR,
        borderTopColor: 'rgba(0,0,0,0.08)',
    },
    barCreamGreen: {
        backgroundColor: CREAM_BAR,
        borderTopWidth: 0,
    },
    barRecording: {
        borderTopColor: 'rgba(0,0,0,0.06)',
        borderLeftWidth: 0,
    },
    idleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        flex: 1,
        minHeight: 52,
    },
    attachBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    input: {
        flex: 1,
        minHeight: 42,
        maxHeight: 100,
        backgroundColor: INPUT_BG,
        borderRadius: INPUT_RADIUS,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111',
        borderWidth: 0,
        ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
        ...(Platform.OS === 'android' && { outlineStyle: 'none' }),
    },
    inputEditing: {
        backgroundColor: 'rgba(236,0,139,0.06)',
    },
    actionBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    actionBtnOnGreen: {
        backgroundColor: '#fff',
    },
    actionBtnDisabled: {
        opacity: 0.6,
    },
    recordBlock: {
        width: '100%',
    },
    waveformTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        minHeight: 44,
        marginBottom: 6,
    },
    waveformFull: {
        flex: 1,
        minWidth: 0,
        height: 36,
    },
    recordControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
    },
    recordControlsSpacer: {
        flex: 1,
    },
    recordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minHeight: 52,
    },
    redDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ea4335',
    },
    timerText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111',
        fontVariant: ['tabular-nums'],
        minWidth: 32,
    },
    waveformWrap: {
        flex: 1,
        minWidth: 0,
        height: 28,
        maxWidth: 120,
    },
    progressWrap: {
        flex: 1,
        height: 4,
        backgroundColor: '#ddd',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    recordBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BTN_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
