/**
 * Language Soup — Copy philosophy for loading states & buttons
 *
 * - lowercase: casual, friendly, not corporate
 * - playful: human phrases, not "Loading..." or "Submit"
 * - random where it fits: pick one of several variants so the app feels alive
 * - emojis: default to black/dark skin tone (🏿) for hand/body emojis — never yellow
 *
 * Use pickRandom() for one-off labels (e.g. per message); use a fixed entry
 * when the same screen should stay consistent (e.g. one loading line per session).
 */

export function pickRandom(arr) {
    if (!arr?.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
}

// —— Transcript (voice memo → text) ———
export const GET_TRANSCRIPT_LABELS = [
    'get transcript',
    'see what they said',
    'read it instead',
    'turn into text',
    'write it down',
    'show me the words',
    'what did they say?',
    'let me read that',
    'transcript please',
    'read the transcript',
    'so I can read it on the train',
    'listening? no — reading',
];
export const GETTING_TRANSCRIPT_LABELS = [
    'getting transcript…',
    'writing it down…',
    'listening and typing…',
    'turning speech into text…',
    'one sec, writing it down…',
    'putting it into words…',
    'being a good listener…',
    'catching every word…',
    'jotting it down…',
    'making it readable…',
];

// —— Sending / posting (messages, images) ———
export const SEND_BUTTON_LABELS = [
    'send',
    'send it',
    'go',
];
export const SENDING_LABELS = [
    'sending…',
    'sending it…',
    'one sec…',
    'almost there…',
    'flying your way…',
];

// —— Joining / opening (groups, chat) ———
export const JOIN_BUTTON_LABELS = [
    'join',
    'join group',
];
export const JOINING_LABELS = [
    'joining…',
    'one sec…',
    'getting you in…',
    'adding you to the soup…',
];
export const OPENING_CHAT_LABELS = [
    'opening chat…',
    'one sec…',
    'connecting you…',
];

// —— Generic loading (spinners, podcast, etc.) ———
export const GENERIC_LOADING_LABELS = [
    'loading…',
    'one sec…',
    'almost there…',
    'getting things ready…',
];

// —— Try again / error recovery ———
export const TRY_AGAIN_LABELS = [
    'try again',
    'one more time?',
    'give it another go',
];
