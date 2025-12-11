import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
};

export const ChatStyles = StyleSheet.create({
    // Container
    messagesList: {
        paddingHorizontal: 16
    },

    // Date Separator
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 16
    },
    dateSeparatorBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12
    },
    dateSeparatorText: {
        fontSize: 12,
        color: Colors.textLight,
        fontWeight: '600'
    },

    // Message Rows
    messageRow: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-end'
    },
    rowMe: {
        justifyContent: 'flex-end'
    },
    rowThem: {
        justifyContent: 'flex-start'
    },

    // Avatars
    avatarContainer: {
        marginRight: 8
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16
    },
    avatarPlaceholder: {
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold'
    },

    // Message Bubbles
    bubble: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        maxWidth: '72%',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 1
    },
    bubbleVoice: {
        paddingVertical: 4,
        paddingHorizontal: 6
    },
    bubbleMe: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 6
    },
    bubbleThem: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 6,
        borderWidth: 1,
        borderColor: '#F2F2F7'
    },
    bubbleSending: {
        opacity: 0.7
    },

    // Text
    senderName: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
        marginBottom: 4
    },
    messageText: {
        fontSize: 16,
        color: '#000',
        lineHeight: 20
    },
    messageTextMe: {
        color: '#fff'
    },

    // Typing Indicator
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 4
    },
    typingAvatarContainer: {
        marginRight: 8
    },
    typingAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16
    },
    typingBubble: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    typingDots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8E8E93'
    },
    dot1: { opacity: 0.4 },
    dot2: { opacity: 0.6 },
    dot3: { opacity: 0.8 },

    // Input Area
    inputContainer: {
        backgroundColor: SOUP_COLORS.cream,
        paddingHorizontal: 10,
        paddingTop: 8
    },
    standardInputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8
    },
    textInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        color: '#000'
    },
    micContainer: {
        alignItems: 'center',
        gap: 2
    },
    micButton: {
        padding: 8
    },
    tapHint: {
        fontSize: 9,
        color: Colors.textLight,
        fontWeight: '500'
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center'
    },

    // Recording Bar
    recordingBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 12
    },
    cancelButton: {
        padding: 8
    },
    recordingMain: {
        flex: 1,
        alignItems: 'center',
        gap: 8
    },
    waveformWrapper: {
        width: '100%',
        height: 42,
        backgroundColor: 'rgba(0, 173, 239, 0.04)',
        borderRadius: 21,
        overflow: 'hidden',
        paddingHorizontal: 12
    },
    recordingTimer: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        letterSpacing: 0.5
    },
    sendVoiceButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center'
    },
});
