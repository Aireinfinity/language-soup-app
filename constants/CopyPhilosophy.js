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

// —— Tagline suggestions (onboarding: "need inspiration?") ———
export const TAGLINE_SUGGESTIONS = [
    'founder daddy',
    'scared to send voice memos',
    'rambler',
    'lurker',
    'community momager',
    'slay slay slay',
    'always late to challenges',
    'polyglot in training',
    'here for the vibes',
    'duolingo dropout',
    'actually here to speak',
    'slow but consistent',
    'forgot my headphones again',
    'voice memo enthusiast',
    'learning by doing',
    'no thoughts just sounds',
    'trying to sound less like a robot',
    'chaotic language energy',
    'forgot what language this is',
    'here to make mistakes loudly',
    'conversation over perfection',
    'weekend warrior',
    'early bird speaker',
    'night owl practicer',
    'just here for the soup',
    'soup enthusiast',
    'language soup enthusiast',
    'can say hello in 5 languages',
    'forgot how to say hello',
    'recovering perfectionist',
    'messy but trying',
    'here to listen and repeat',
    'building the habit',
    'one voice note at a time',
    'small steps gang',
    'group chat lurker',
    'finally actually speaking',
    // more fun / random / vibes
    'here for the accent',
    'bad at grammar, good at vibes',
    'forgot to practice yesterday',
    'speaking > scrolling',
    'voice note addict',
    'soup of the day',
    'lost in translation (on purpose)',
    'making it weird in multiple languages',
    'no duolingo owl here',
    'here to embarrass myself daily',
    'pronunciation chaos',
    'collecting accents',
    'would rather speak than type',
    'voice memo gremlin',
    'trying to sound human',
    'multilingual mess',
    'here for the bloopers',
    'practicing out loud (sorry neighbors)',
    'one word at a time',
    'forgot my script',
    'winging it in 3 languages',
    'here to listen first',
    'slow speaker energy',
    'making friends via voice',
    'soup chef in training',
    'here for the real talk',
    'no filter in any language',
];
// Templates: use first language (lowercase) for {lang}, e.g. "future spanish speaker"
export const TAGLINE_LANGUAGE_TEMPLATES = [
    'future {lang} speaker',
    'here for {lang}',
    'obsessed with {lang}',
    'learning {lang} one meme at a time',
    '{lang} newbie',
    'here to speak {lang}',
    'slowly falling in love with {lang}',
    'lost in {lang}',
    '{lang} chaos only',
    'here for the {lang} vibes',
    'speaking {lang} (badly)',
    '{lang} or bust',
];

/** Picks a random tagline. If languages[0] is provided, 50% chance to use a language template. */
export function getRandomTagline(languages = []) {
    const lang = (languages && languages[0]) ? String(languages[0]).toLowerCase() : null;
    const useTemplate = lang && Math.random() < 0.5;
    if (useTemplate) {
        const template = pickRandom(TAGLINE_LANGUAGE_TEMPLATES);
        return template.replace(/\{lang\}/g, lang);
    }
    return pickRandom(TAGLINE_SUGGESTIONS);
}

/** Returns a random subset of taglines for chips (e.g. 8). Does not include language templates. */
export function getRandomTaglineChips(count = 8) {
    const shuffled = [...TAGLINE_SUGGESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, TAGLINE_SUGGESTIONS.length));
}

/** Returns a random mix of static taglines and language-filled templates for chips. Good for "need inspiration?" with user's languages. */
export function getRandomTaglineChipsWithLanguages(count = 10, languages = []) {
    const lang = (languages && languages[0]) ? String(languages[0]).toLowerCase() : null;
    const pool = [...TAGLINE_SUGGESTIONS];
    if (lang) {
        const filled = TAGLINE_LANGUAGE_TEMPLATES.map(t => t.replace(/\{lang\}/g, lang));
        pool.push(...filled);
    }
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// —— New ideas (phrases/vocab) — same question, different options ———
export const NEW_IDEAS_BUTTON_LABELS = [
    'other ideas',
    'new ideas',
    'mix it up',
    'different phrases',
    'other ways to say it',
];
export const NEW_IDEAS_LOADING_LABELS = [
    'thinking of new ones…',
    'mixing it up…',
    'finding other ways to say it…',
    'one sec…',
];
