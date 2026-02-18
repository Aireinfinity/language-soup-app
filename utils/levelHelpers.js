/**
 * Shared level logic for profile and user preview modal.
 * Speak = output (minutes); listen = input (hours, estimated from speaking when no listening RPC).
 */

export function getOutputLevel(minutes) {
    if (minutes < 30) return { level: 1, name: 'First Words 🌱', nextGoal: 30, prevGoal: 0, color: '#8BC34A' };
    if (minutes < 120) return { level: 2, name: 'Sentence Builder 🧱', nextGoal: 120, prevGoal: 30, color: '#4CAF50' };
    if (minutes < 300) return { level: 3, name: 'Conversation Starter 💬', nextGoal: 300, prevGoal: 120, color: '#00BCD4' };
    if (minutes < 600) return { level: 4, name: 'Daily Souper 🍜', nextGoal: 600, prevGoal: 300, color: '#FF9800' };
    if (minutes < 1200) return { level: 5, name: 'Fluent Rambler 🎙️', nextGoal: 1200, prevGoal: 600, color: '#E91E63' };
    return { level: 6, name: 'Native Vibes 🌟', nextGoal: 1200, prevGoal: 1200, color: '#9C27B0', maxed: true };
}

export function getInputLevel(hours) {
    if (hours < 3) return { level: 1, name: 'Ear Training 👂', nextGoal: 3, prevGoal: 0, color: '#8BC34A' };
    if (hours < 10) return { level: 2, name: 'Word Catcher 🎣', nextGoal: 10, prevGoal: 3, color: '#4CAF50' };
    if (hours < 30) return { level: 3, name: 'Context King 👑', nextGoal: 30, prevGoal: 10, color: '#00BCD4' };
    if (hours < 100) return { level: 4, name: 'Comprehension Pro 🧠', nextGoal: 100, prevGoal: 30, color: '#FF9800' };
    if (hours < 300) return { level: 5, name: 'Native Speed 🚀', nextGoal: 300, prevGoal: 100, color: '#E91E63' };
    return { level: 6, name: 'Polyglot 🌍', nextGoal: 300, prevGoal: 300, color: '#9C27B0', maxed: true };
}

/**
 * Compute speak + listen level info from get_user_stats() result.
 * Listen is estimated as 2× speaking time (no listening RPC yet).
 */
export function computeLevelsFromStats(stats) {
    const totalSpeakSeconds = stats?.total_speaking_seconds ?? 0;
    const speakMinutes = totalSpeakSeconds / 60;
    const speakLevelInfo = getOutputLevel(speakMinutes);
    // Estimate listening: 2× speaking time as "time listening to others"
    const listenHours = (totalSpeakSeconds * 2) / 3600;
    const listenLevelInfo = getInputLevel(listenHours);
    return {
        speakLevel: speakLevelInfo.level,
        speakName: speakLevelInfo.name,
        listenLevel: listenLevelInfo.level,
        listenName: listenLevelInfo.name,
    };
}
