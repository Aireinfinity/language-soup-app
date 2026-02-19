import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#FDF5E6',
    green: '#19b091',
};

const VOICE_BUBBLE_MAX_WIDTH = 300;

export const ChatStyles = StyleSheet.create({
    // Container (bold, warm, room to breathe)
    messagesList: {
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: SOUP_COLORS.cream,
    },

    // Date Separator (bold brand accent)
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 20
    },
    dateSeparatorBadge: {
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
        shadowColor: SOUP_COLORS.pink,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    dateSeparatorText: {
        fontSize: 14,
        color: SOUP_COLORS.pink,
        fontWeight: '800'
    },

    // Message Rows (faces first; voice rows get more space)
    messageRow: {
        flexDirection: 'row',
        marginBottom: 14,
        alignItems: 'flex-end'
    },
    messageRowVoice: {
        marginBottom: 18
    },
    rowMe: {
        justifyContent: 'flex-end'
    },
    rowThem: {
        justifyContent: 'flex-start',
        alignItems: 'flex-end'
    },

    // Avatars (smaller so messages feel longer and less chunky)
    avatarContainer: {
        marginRight: 10
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 12
    },
    avatarPlaceholder: {
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800'
    },

    // Message Bubbles (thinner: less padding, wider so messages feel slim and readable)
    bubble: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        maxWidth: '90%',
        minWidth: 56,
        borderRadius: 18,
        borderBottomRightRadius: 6,
        borderBottomLeftRadius: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 2
    },
    bubbleVoice: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        maxWidth: VOICE_BUBBLE_MAX_WIDTH,
    },
    bubbleMe: {
        backgroundColor: SOUP_COLORS.green,
        borderBottomRightRadius: 6
    },
    bubbleThem: {
        backgroundColor: SOUP_COLORS.blue,
        borderBottomLeftRadius: 6,
        borderWidth: 0,
    },
    bubbleFromBot: {
        backgroundColor: SOUP_COLORS.pink,
        borderBottomLeftRadius: 6,
        borderWidth: 0,
    },
    bubbleSending: {
        opacity: 0.7
    },

    // Text (bold: who said it, easy to read)
    senderName: {
        fontSize: 15,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
        marginBottom: 6
    },
    senderNameThem: {
        color: 'rgba(255,255,255,0.95)',
    },
    senderNameBot: {
        color: '#fff',
    },
    messageText: {
        fontSize: 17,
        color: '#000',
        lineHeight: 26,
        fontWeight: '500'
    },
    messageTextMe: {
        color: '#fff'
    },
    messageTextThem: {
        color: '#fff'
    },
    messageTextBot: {
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

    // Input Area: cream with green accents (no gray outline)
    inputContainer: {
        backgroundColor: SOUP_COLORS.cream,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
        borderWidth: 0,
    },
    textInput: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 14,
        fontSize: 17,
        maxHeight: 100,
        color: '#000',
        borderWidth: 0,
    },
    textInputEditing: {
        backgroundColor: 'rgba(236, 0, 139, 0.05)', // Subtle pink background when editing
    },
    inputContainerWithPreview: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    micButton: {
        padding: 8
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
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
    // Voice Preview Mode Styles
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    previewLabel: {
        fontSize: 14,
        color: Colors.textLight,
        fontWeight: '500',
        flex: 1
    },

    // Reply/Edit Preview (no heavy bar above input)
    previewContainerMerged: {
        backgroundColor: 'rgba(253,249,244,0.98)',
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    editPreviewInline: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(236,0,139,0.04)',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    editBarInline: {
        width: 4,
        height: '100%',
        backgroundColor: SOUP_COLORS.pink,
        borderRadius: 2,
        marginRight: 12,
    },
    editContentInline: {
        flex: 1,
    },
    editLabelInline: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
        marginBottom: 2,
    },
    editMessageInline: {
        fontSize: 14,
        color: '#666',
    },
    editCloseButtonInline: {
        padding: 4,
        marginLeft: 12,
    },
    // System Messages (e.g., "This message was deleted")
    systemMessageContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
        paddingHorizontal: 40,
    },
    systemMessageText: {
        fontSize: 12,
        color: '#8e8e93',
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        overflow: 'hidden',
    },
    // Image/Video Messages (inline, WhatsApp-style)
    messageImage: {
        width: 260,
        maxWidth: '100%',
        height: 260,
        borderRadius: 18,
        marginBottom: 4,
        overflow: 'hidden',
    },
});

/** Compact overrides for feed view: fit ~5–7 messages without scrolling (one challenge per day, all responses) */
export const CompactChatOverrides = StyleSheet.create({
    messagesList: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    dateSeparator: {
        marginVertical: 6,
    },
    dateSeparatorBadge: {
        paddingVertical: 2,
        paddingHorizontal: 8,
    },
    dateSeparatorText: {
        fontSize: 11,
    },
    messageRow: {
        marginBottom: 5,
    },
    avatarContainer: {
        marginRight: 5,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 10,
    },
    avatarText: {
        fontSize: 11,
    },
    bubble: {
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    bubbleVoice: {
        paddingVertical: 2,
        paddingHorizontal: 4,
    },
    senderName: {
        fontSize: 11,
        marginBottom: 2,
    },
    messageText: {
        fontSize: 13,
        lineHeight: 17,
    },
});
