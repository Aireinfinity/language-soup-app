/**
 * Check if user has filled out profile and joined at least one group (required to send messages).
 * Used to gate send in chat until they complete profile + groups.
 */
import { supabase } from '../lib/supabase';

export async function getProfileComplete(userId) {
    if (!userId) return false;
    try {
        const [userRes, groupsRes] = await Promise.all([
            supabase.from('app_users').select('display_name, status_text, avatar_url, fluent_languages, learning_languages, bio').eq('id', userId).single(),
            supabase.from('app_group_members').select('group_id').eq('user_id', userId),
        ]);
        const u = userRes?.data;
        const groups = groupsRes?.data || [];
        if (!u) return false;
        const hasName = !!(u.display_name && String(u.display_name).trim());
        const hasTagline = !!(u.status_text && String(u.status_text).trim());
        const hasAvatar = !!(u.avatar_url && String(u.avatar_url).trim());
        const hasLanguages = (Array.isArray(u.fluent_languages) && u.fluent_languages.length > 0) ||
            (Array.isArray(u.learning_languages) && u.learning_languages.length > 0);
        const hasGroups = groups.length > 0;
        return hasName && hasTagline && hasAvatar && hasLanguages && hasGroups;
    } catch (_) {
        return false;
    }
}
