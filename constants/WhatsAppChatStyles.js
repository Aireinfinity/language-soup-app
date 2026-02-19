/**
 * WhatsApp parity styles: paper background, simple date labels, light input bar.
 * Use with SharedChatUI theme="whatsapp". Brand: our blue for "me" bubbles (ChatStyles.bubbleMe).
 */
import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

// WhatsApp paper background
const CHAT_BG = '#E5DDD5';
const INPUT_BAR_BG = '#F0F2F5';

export const WhatsAppChatStyles = StyleSheet.create({
    messagesList: {
        paddingHorizontal: 8,
        paddingVertical: 12,
        backgroundColor: CHAT_BG,
    },
    dateSeparator: {
        alignItems: 'center',
        marginVertical: 12,
    },
    dateSeparatorBadge: {
        backgroundColor: 'rgba(0,0,0,0.12)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
    },
    dateSeparatorText: {
        fontSize: 12,
        color: '#667781',
        fontWeight: '600',
    },
    inputContainer: {
        backgroundColor: INPUT_BAR_BG,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
});

// For header: subtle bar like WhatsApp
export const whatsAppHeaderBorder = {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
};
