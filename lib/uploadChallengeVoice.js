import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

/**
 * Upload a voice recording for a challenge and insert the app_messages row.
 * Used by ChallengeQueue (modal) and by the Today hero card flow.
 * @param {{ uri: string, duration: number }} audioResult - duration in ms
 * @param {{ id: string, group_id: string }} challenge
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function uploadChallengeVoiceReply(audioResult, challenge, userId) {
    if (!audioResult?.uri || !challenge?.id || !challenge?.group_id || !userId) {
        throw new Error('Missing required args for uploadChallengeVoiceReply');
    }
    const { uri, duration } = audioResult;
    const audioData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const fileName = `language-chat/${userId}/voice_challenge_${challenge.id}_${Date.now()}.m4a`;
    const { error: uploadError } = await supabase.storage
        .from('voice-memos')
        .upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);
    const { error: insertError } = await supabase.from('app_messages').insert({
        sender_id: userId,
        group_id: challenge.group_id,
        challenge_id: challenge.id,
        message_type: 'voice',
        media_url: publicUrl,
        duration_seconds: Math.max(1, Math.floor(duration / 1000)),
        content: '',
    });
    if (insertError) throw insertError;

    supabase.functions.invoke('notify-challenge-reply', {
        body: { group_id: challenge.group_id, sender_id: userId },
    }).catch(() => {});

    await supabase
        .from('app_group_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('group_id', challenge.group_id);
}

const FIRST_VOICE_CONTENT = 'ur first word 🎙️';

/**
 * Upload one voice recording and insert a message to each group (first-challenge / onboarding).
 * @param {{ uri: string, duration: number }} audioResult - duration in ms
 * @param {{ id: string }[]} groups - list of { id }
 * @param {string} userId
 */
export async function uploadFirstVoiceToGroups(audioResult, groups, userId) {
    if (!audioResult?.uri || !groups?.length || !userId) throw new Error('Missing args for uploadFirstVoiceToGroups');
    const { uri, duration } = audioResult;
    const audioData = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const fileName = `language-chat/${userId}/voice_onboarding_${Date.now()}.m4a`;
    const { error: uploadError } = await supabase.storage
        .from('voice-memos')
        .upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);
    const durationSec = Math.max(1, Math.floor((duration || 0) / 1000));
    const inserts = groups.map(g =>
        supabase.from('app_messages').insert({
            sender_id: userId,
            group_id: g.id,
            message_type: 'voice',
            content: FIRST_VOICE_CONTENT,
            media_url: publicUrl,
            duration_seconds: durationSec,
            metadata: {
                type: 'voice',
                duration: durationSec,
                path: fileName,
                challenge_id: 'onboarding-icebreaker',
                is_first_word: true,
            },
        })
    );
    const results = await Promise.all(inserts);
    const firstError = results.find(r => r.error);
    if (firstError) throw firstError.error;

    await supabase
        .from('app_group_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('group_id', groups.map(g => g.id));
}
