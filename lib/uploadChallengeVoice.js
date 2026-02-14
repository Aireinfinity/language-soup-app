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

    await supabase
        .from('app_group_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('group_id', challenge.group_id);
}
