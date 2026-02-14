/**
 * Match onboarding picker language strings to app_groups.language values.
 * Picker uses "French (Français)", "Chinese/Mandarin (中文)"; DB may store "French", "Français", "Spanish", etc.
 */

function normalize(s) {
    return (s || '').trim().toLowerCase();
}

/**
 * Get the string we should use to match a group to a picker language.
 * Prefers group.language; falls back to group.name (e.g. "French #advanced").
 */
export function getGroupLanguageForMatch(group) {
    const raw = (group?.language || group?.name || '').trim();
    if (!raw) return '';
    return raw;
}

/**
 * Normalize group-side language for comparison: strip level suffix so
 * "French - Beginner", "French (Beginner)", "French #advanced" all become "French".
 */
function normalizeGroupLanguage(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const s = raw.trim();
    const withoutLevel = s
        .replace(/\s*[-–—]\s*.*$/, '')  // "French - Beginner" -> "French"
        .replace(/\s*[\(\#].*$/, '')     // "French (Beginner)" or "French #advanced" -> "French"
        .trim();
    return normalize(withoutLevel || s);
}

/**
 * From a picker string, get possible values the DB might store.
 * e.g. "French (Français)" -> ["French (Français)", "French", "Français"]
 *      "Chinese/Mandarin (中文)" -> ["Chinese/Mandarin (中文)", "Chinese", "Mandarin", "中文"]
 */
export function pickerLanguageToVariants(pickerLang) {
    if (!pickerLang || typeof pickerLang !== 'string') return [];
    const s = pickerLang.trim();
    const variants = new Set([s]);
    const beforeParen = s.split('(')[0].trim();
    if (beforeParen) variants.add(beforeParen);
    const beforeSlash = s.split('/')[0].trim();
    if (beforeSlash) variants.add(beforeSlash);
    const afterSlash = s.split('/').slice(1).join('/').split('(')[0].trim();
    if (afterSlash) variants.add(afterSlash);
    const inParens = s.match(/\(([^)]+)\)/);
    if (inParens && inParens[1]) variants.add(inParens[1].trim());
    const inParensFull = s.match(/\(([^)]+)\)/);
    if (inParensFull && inParensFull[1]) variants.add(inParensFull[1].trim());
    return [...variants];
}

/**
 * Returns true if group.language (or group name) matches the picker language (any variant).
 * groupLanguageOrName: group.language, or group.name when language is empty, or the result of getGroupLanguageForMatch(group).
 * Handles DB values like "French - Beginner", "French #advanced" by stripping level suffix for matching.
 */
export function groupLanguageMatchesPicker(groupLanguageOrName, pickerLanguage) {
    const raw = (groupLanguageOrName ?? '').toString().trim();
    if (!raw || !pickerLanguage) return false;
    const g = normalize(raw);
    const groupBase = normalizeGroupLanguage(raw);
    if (!g && !groupBase) return false;
    const variants = pickerLanguageToVariants(pickerLanguage);
    for (const v of variants) {
        const n = normalize(v);
        if (!n) continue;
        for (const groupVal of [g, groupBase].filter(Boolean)) {
            if (groupVal === n) return true;
            if (groupVal.includes(n) || n.includes(groupVal)) return true;
            if (groupVal.startsWith(n) || n.startsWith(groupVal)) return true;
        }
    }
    return false;
}
