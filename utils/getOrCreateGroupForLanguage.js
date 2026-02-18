/**
 * Find an existing visible group that matches the picker language, or create a new one,
 * then add the user as a member. Used when a user requests a language we don't have yet.
 * @param {object} supabase - Supabase client
 * @param {string} userId - app_users.id
 * @param {string} pickerLanguage - e.g. "Mooré (Mòoré)" or "Kurdish (Kurdî)"
 * @returns {Promise<{ id: string, name: string, language: string }|null>} group or null on error
 */
import { groupLanguageMatchesPicker } from './languageGroupMatch';

function displayName(pickerLang) {
    if (!pickerLang || typeof pickerLang !== 'string') return '';
    return pickerLang.split(' (')[0].split('/')[0].trim() || pickerLang.trim();
}

export async function getOrCreateGroupForLanguage(supabase, userId, pickerLanguage) {
    if (!supabase || !userId || !pickerLanguage?.trim()) return null;
    const name = displayName(pickerLanguage);

    // 1) Find existing visible group that matches this picker language
    const { data: existing } = await supabase
        .from('app_groups')
        .select('id, name, language')
        .eq('is_visible', true)
        .limit(100);
    const match = (existing || []).find((g) => groupLanguageMatchesPicker(g.language || g.name, pickerLanguage));
    if (match) {
        await supabase
            .from('app_group_members')
            .upsert({ user_id: userId, group_id: match.id, role: 'member' }, { onConflict: 'user_id,group_id' });
        return { id: match.id, name: match.name || name, language: match.language || pickerLanguage };
    }

    // 2) Create new group and add user
    const { data: created, error: insertErr } = await supabase
        .from('app_groups')
        .insert({
            name,
            language: pickerLanguage,
            is_visible: true,
            member_count: 1,
        })
        .select('id, name, language')
        .single();
    if (insertErr || !created) return null;
    const { error: memberErr } = await supabase
        .from('app_group_members')
        .upsert({ user_id: userId, group_id: created.id, role: 'member' }, { onConflict: 'user_id,group_id' });
    if (memberErr) return null;
    return { id: created.id, name: created.name || name, language: created.language || pickerLanguage };
}
