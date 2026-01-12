import { supabase } from './supabase';

/**
 * Extract features from a challenge prompt for similarity matching
 */
function extractFeatures(text) {
    const lower = text.toLowerCase();
    const wordCount = text.trim().split(/\s+/).length;

    return {
        wordCount,
        hasQuestion: text.includes('?'),
        hasChoice: lower.includes(' or ') && wordCount < 10,
        hasMusicKeyword: /song|music|listen|spotify/i.test(text),
        hasPhotoKeyword: /photo|pic|picture|show|share/i.test(text),
        hasFavoriteKeyword: /favorite|best|worst/i.test(text),
        hasDayKeyword: /day \d|challenge/i.test(text)
    };
}

/**
 * Calculate similarity score between two feature sets (0-1)
 */
function calculateSimilarity(features1, features2) {
    let score = 0;
    let maxScore = 0;

    // Word count similarity (most important)
    const wordDiff = Math.abs(features1.wordCount - features2.wordCount);
    score += Math.max(0, 5 - wordDiff); // 0-5 points
    maxScore += 5;

    // Boolean feature matches
    const booleanFeatures = ['hasQuestion', 'hasChoice', 'hasMusicKeyword', 'hasPhotoKeyword', 'hasFavoriteKeyword', 'hasDayKeyword'];
    booleanFeatures.forEach(feature => {
        if (features1[feature] === features2[feature]) {
            score += 1;
        }
        maxScore += 1;
    });

    return score / maxScore;
}

/**
 * Predict response rate for a new challenge prompt
 */
export async function predictResponseRate(promptText) {
    // Check cache first (24h TTL)
    const cacheKey = `soup_prediction_${promptText.toLowerCase().trim()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < 24 * 60 * 60 * 1000) { // 24 hours
            return data;
        }
    }

    const features = extractFeatures(promptText);

    // Fetch historical performance data
    const { data: history, error } = await supabase
        .from('challenge_performance_log')
        .select('*')
        .not('measured_at', 'is', null) // Only measured challenges
        .order('sent_at', { ascending: false })
        .limit(200); // Last 200 challenges

    if (error || !history || history.length === 0) {
        return {
            predicted: null,
            confidence: 'none',
            message: 'No historical data yet. Send your first challenge to start learning!',
            sampleSize: 0
        };
    }

    // Find similar challenges
    const similarities = history.map(h => ({
        ...h,
        similarity: calculateSimilarity(features, {
            wordCount: h.word_count,
            hasQuestion: h.has_question,
            hasChoice: h.has_choice,
            hasMusicKeyword: h.has_music_keyword,
            hasPhotoKeyword: h.has_photo_keyword,
            hasFavoriteKeyword: h.has_favorite_keyword,
            hasDayKeyword: h.has_day_keyword
        })
    }));

    // Get top 20 most similar (similarity > 0.5)
    const similar = similarities
        .filter(s => s.similarity > 0.5)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20);

    if (similar.length < 3) {
        return {
            predicted: null,
            confidence: 'low',
            message: `Only ${similar.length} similar examples found. Need at least 3 for prediction.`,
            sampleSize: similar.length,
            totalDataPoints: history.length
        };
    }

    // Calculate weighted average (weight by similarity)
    const totalWeight = similar.reduce((sum, s) => sum + s.similarity, 0);
    const weightedRate = similar.reduce((sum, s) => sum + (s.response_rate * s.similarity), 0) / totalWeight;

    // Calculate standard deviation for confidence interval
    const rates = similar.map(s => s.response_rate);
    const mean = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    const variance = rates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rates.length;
    const stdDev = Math.sqrt(variance);

    // Determine confidence level
    let confidence = 'low';
    if (similar.length >= 10 && stdDev < 15) confidence = 'high';
    else if (similar.length >= 5 && stdDev < 20) confidence = 'medium';

    const result = {
        predicted: Math.round(weightedRate * 10) / 10, // Round to 1 decimal
        range: [
            Math.max(0, Math.round((weightedRate - stdDev) * 10) / 10),
            Math.min(100, Math.round((weightedRate + stdDev) * 10) / 10)
        ],
        confidence,
        sampleSize: similar.length,
        totalDataPoints: history.length,
        message: null
    };

    // Cache the result
    localStorage.setItem(cacheKey, JSON.stringify({
        data: result,
        timestamp: Date.now()
    }));

    return result;
}

/**
 * Log a challenge when it's sent (for future measurement)
 */
export async function logChallengeSent(challengeId, challengeText, totalMembers) {
    const features = extractFeatures(challengeText);

    const { error } = await supabase
        .from('challenge_performance_log')
        .insert({
            challenge_id: challengeId,
            challenge_text: challengeText,
            total_members: totalMembers,
            word_count: features.wordCount,
            has_question: features.hasQuestion,
            has_choice: features.hasChoice,
            has_music_keyword: features.hasMusicKeyword,
            has_photo_keyword: features.hasPhotoKeyword,
            has_favorite_keyword: features.hasFavoriteKeyword,
            has_day_keyword: features.hasDayKeyword
        });

    if (error) {
        console.error('Failed to log challenge:', error);
    }
}
