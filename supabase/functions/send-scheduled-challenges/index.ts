import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';

// Language name -> DeepL code. Keep in sync with src/languageUtils.js (single source of truth).
function getDeepLLangCode(language: string): string | null {
    const lang = (language || '').toLowerCase();
    if (lang.includes('spanish') || lang.includes('español')) return 'ES';
    if (lang.includes('french') || lang.includes('français')) return 'FR';
    if (lang.includes('italian') || lang.includes('italiano')) return 'IT';
    if (lang.includes('german') || lang.includes('deutsch')) return 'DE';
    if (lang.includes('portuguese') || lang.includes('português')) return 'PT';
    if (lang.includes('dutch') || lang.includes('nederlands')) return 'NL';
    if (lang.includes('danish') || lang.includes('dansk')) return 'DA';
    if (lang.includes('swedish') || lang.includes('svenska')) return 'SV';
    if (lang.includes('norwegian') || lang.includes('norsk')) return 'NB';
    if (lang.includes('finnish') || lang.includes('suomi')) return 'FI';
    if (lang.includes('polish') || lang.includes('polski')) return 'PL';
    if (lang.includes('czech') || lang.includes('čeština')) return 'CS';
    if (lang.includes('greek') || lang.includes('ελληνικά')) return 'EL';
    if (lang.includes('hungarian') || lang.includes('magyar')) return 'HU';
    if (lang.includes('romanian') || lang.includes('română')) return 'RO';
    if (lang.includes('bulgarian') || lang.includes('български')) return 'BG';
    if (lang.includes('slovak') || lang.includes('slovenčina')) return 'SK';
    if (lang.includes('slovenian') || lang.includes('slovenščina')) return 'SL';
    if (lang.includes('estonian') || lang.includes('eesti')) return 'ET';
    if (lang.includes('latvian') || lang.includes('latviešu')) return 'LV';
    if (lang.includes('lithuanian') || lang.includes('lietuvių')) return 'LT';
    if (lang.includes('russian') || lang.includes('русский')) return 'RU';
    if (lang.includes('japanese') || lang.includes('日本語')) return 'JA';
    if (lang.includes('chinese') || lang.includes('中文') || lang.includes('mandarin')) return 'ZH';
    if (lang.includes('korean') || lang.includes('한국어')) return 'KO';
    if (lang.includes('indonesian') || lang.includes('bahasa')) return 'ID';
    if (lang.includes('turkish') || lang.includes('türkçe')) return 'TR';
    if (lang.includes('arabic') || lang.includes('العربية')) return 'AR';
    if (lang.includes('persian') || lang.includes('فارسی') || lang.includes('farsi')) return 'FA';
    if (lang.includes('hindi') || lang.includes('हिन्दी')) return 'HI';
    if (lang.includes('hebrew') || lang.includes('עברית')) return 'HE';
    if (lang.includes('vietnamese') || lang.includes('tiếng việt')) return 'VI';
    if (lang.includes('thai') || lang.includes('ไทย')) return 'TH';
    if (lang.includes('tagalog') || lang.includes('filipino')) return 'TL';
    if (lang.includes('ukrainian') || lang.includes('українська')) return 'UK';
    if (lang.includes('croatian') || lang.includes('hrvatski')) return 'HR';
    if (lang.includes('serbian') || lang.includes('српски')) return 'SR';
    if (lang.includes('bengali') || lang.includes('বাংলা')) return 'BN';
    if (lang.includes('swahili') || lang.includes('kiswahili')) return 'SW';
    if (lang.includes('yoruba')) return 'YO';
    if (lang.includes('zulu')) return 'ZU';
    if (lang.includes('afrikaans')) return 'AF';
    if (lang.includes('galician') || lang.includes('galego')) return 'GL';
    return null;
}

// Language name -> Google code. Keep in sync with src/languageUtils.js (single source of truth).
function getGoogleLangCode(language: string): string | null {
    const lang = (language || '').toLowerCase();
    if (lang === 'english') return null;
    if (lang.includes('spanish') || lang.includes('español')) return 'es';
    if (lang.includes('french') || lang.includes('français')) return 'fr';
    if (lang.includes('italian') || lang.includes('italiano')) return 'it';
    if (lang.includes('german') || lang.includes('deutsch')) return 'de';
    if (lang.includes('portuguese') || lang.includes('português')) return 'pt';
    if (lang.includes('dutch') || lang.includes('nederlands')) return 'nl';
    if (lang.includes('danish') || lang.includes('dansk')) return 'da';
    if (lang.includes('swedish') || lang.includes('svenska')) return 'sv';
    if (lang.includes('norwegian') || lang.includes('norsk')) return 'no';
    if (lang.includes('finnish') || lang.includes('suomi')) return 'fi';
    if (lang.includes('polish') || lang.includes('polski')) return 'pl';
    if (lang.includes('czech') || lang.includes('čeština')) return 'cs';
    if (lang.includes('greek') || lang.includes('ελληνικά')) return 'el';
    if (lang.includes('hungarian') || lang.includes('magyar')) return 'hu';
    if (lang.includes('romanian') || lang.includes('română')) return 'ro';
    if (lang.includes('bulgarian') || lang.includes('български')) return 'bg';
    if (lang.includes('slovak') || lang.includes('slovenčina')) return 'sk';
    if (lang.includes('slovenian') || lang.includes('slovenščina')) return 'sl';
    if (lang.includes('estonian') || lang.includes('eesti')) return 'et';
    if (lang.includes('latvian') || lang.includes('latviešu')) return 'lv';
    if (lang.includes('lithuanian') || lang.includes('lietuvių')) return 'lt';
    if (lang.includes('croatian') || lang.includes('hrvatski')) return 'hr';
    if (lang.includes('serbian') || lang.includes('српски')) return 'sr';
    if (lang.includes('ukrainian') || lang.includes('українська')) return 'uk';
    if (lang.includes('galician') || lang.includes('galego')) return 'gl';
    if (lang.includes('russian') || lang.includes('русский')) return 'ru';
    if (lang.includes('japanese') || lang.includes('日本語')) return 'ja';
    if (lang.includes('mandarin')) return 'zh-CN';
    if (lang.includes('cantonese')) return 'zh-TW';
    if (lang.includes('chinese') || lang.includes('中文')) return 'zh-CN';
    if (lang.includes('korean') || lang.includes('한국어')) return 'ko';
    if (lang.includes('indonesian') || lang.includes('bahasa')) return 'id';
    if (lang.includes('turkish') || lang.includes('türkçe')) return 'tr';
    if (lang.includes('arabic') || lang.includes('العربية')) return 'ar';
    if (lang.includes('hindi') || lang.includes('हिन्दी')) return 'hi';
    if (lang.includes('vietnamese') || lang.includes('tiếng việt')) return 'vi';
    if (lang.includes('thai') || lang.includes('ไทย')) return 'th';
    if (lang.includes('malay') || lang.includes('melayu')) return 'ms';
    if (lang.includes('tagalog') || lang.includes('filipino')) return 'tl';
    if (lang.includes('swahili') || lang.includes('kiswahili')) return 'sw';
    if (lang.includes('yoruba')) return 'yo';
    if (lang.includes('zulu')) return 'zu';
    if (lang.includes('afrikaans')) return 'af';
    if (lang.includes('moor') || lang.includes('mossi') || lang.includes('mooré') || lang.includes('moore')) return 'mos';
    if (lang.includes('hebrew') || lang.includes('עברית')) return 'iw';
    if (lang.includes('persian') || lang.includes('فارسی') || lang.includes('farsi')) return 'fa';
    if (lang.includes('urdu') || lang.includes('اردو')) return 'ur';
    const firstWord = lang.split(/[\s#]/)[0].trim();
    const autoDetect: Record<string, string> = {
        'bengali': 'bn', 'gujarati': 'gu', 'kannada': 'kn', 'malayalam': 'ml', 'marathi': 'mr',
        'punjabi': 'pa', 'tamil': 'ta', 'telugu': 'te', 'nepali': 'ne', 'sinhala': 'si',
        'khmer': 'km', 'lao': 'lo', 'burmese': 'my', 'amharic': 'am', 'hausa': 'ha',
        'igbo': 'ig', 'somali': 'so', 'cebuano': 'ceb', 'javanese': 'jw', 'sundanese': 'su',
        'uzbek': 'uz', 'kazakh': 'kk', 'azerbaijani': 'az', 'georgian': 'ka', 'armenian': 'hy',
        'albanian': 'sq', 'macedonian': 'mk', 'icelandic': 'is', 'welsh': 'cy', 'irish': 'ga',
        'scots': 'gd', 'basque': 'eu', 'catalan': 'ca', 'corsican': 'co', 'maltese': 'mt',
        'mooré': 'mos', 'moore': 'mos', 'mossi': 'mos',
        'kyrgyz': 'ky', 'montenegrin': 'sr'
    };
    return autoDetect[firstWord] ?? null;
}

/** Translate at send time. Try DeepL → OpenAI (same key as pronunciation) → Google. */
async function translateAtSend(supabase: ReturnType<typeof createClient>, text: string, language: string): Promise<string> {
    const cleanText = text.replace(/^#challenge\s*/i, '').trim();
    const deepl = getDeepLLangCode(language);
    if (deepl) {
        const { data, error } = await supabase.functions.invoke('translate-text', { body: { text: cleanText, targetLang: deepl } });
        if (!error && data?.translatedText) return data.translatedText;
    }
    const { data: openaiData, error: openaiError } = await supabase.functions.invoke('translate-openai', {
        body: { text: cleanText, targetLang: language }
    });
    if (!openaiError && openaiData?.translatedText) return openaiData.translatedText;
    const google = getGoogleLangCode(language);
    if (google && google !== 'mos') {
        const { data, error } = await supabase.functions.invoke('translate-google', { body: { text: cleanText, targetLang: google } });
        if (!error && data?.translatedText) return data.translatedText;
    }
    return cleanText;
}

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get all pending challenges that are due
        const { data: dueChallenges, error: fetchError } = await supabase
            .from('app_scheduled_challenges')
            .select('*')
            .eq('status', 'approved')  // Changed from 'pending' to 'approved'
            .lte('scheduled_time', new Date().toISOString());

        if (fetchError) throw fetchError;

        if (!dueChallenges || dueChallenges.length === 0) {
            return new Response(JSON.stringify({ message: 'No challenges due', count: 0 }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`📅 Found ${dueChallenges.length} challenges to send`);

        // Get all groups
        const { data: groups } = await supabase
            .from('app_groups')
            .select('id, name, language');

        if (!groups) throw new Error('Failed to fetch groups');

        // Process each challenge — translate at send time (revert to pre-change behavior so we don't depend on dashboard saved translations)
        for (const challenge of dueChallenges) {
            console.log(`📤 Processing challenge: ${challenge.id}`);

            const rawText = challenge.challenge_text || '';
            const cleanEnglish = rawText.replace(/^#challenge\s*/i, '').trim();

            for (const group of groups) {
                // Skip test/internal groups — do not send scheduled challenges
                const nameLower = (group.name || '').toLowerCase();
                if (nameLower.includes('app testers') || nameLower.includes("noah's test group solo")) {
                    console.log(`⏭️ Skipping (excluded): ${group.name}`);
                    continue;
                }

                const lang = group.language;
                const isEnglish = !lang || String(lang).toLowerCase() === 'english';
                let finalText: string;
                if (isEnglish) {
                    finalText = `#challenge\n${cleanEnglish}`;
                } else {
                    const translated = await translateAtSend(supabase, rawText, lang);
                    finalText = `#challenge\n${cleanEnglish}\n${translated}`;
                }

                const { error: challengeError } = await supabase
                    .from('app_challenges')
                    .insert({
                        group_id: group.id,
                        prompt_text: finalText,
                        created_by: SYSTEM_BOT_ID,
                    });

                if (challengeError) {
                    console.error(`Failed to insert challenge for group ${group.id}:`, challengeError);
                    continue;
                }

                console.log(`✅ Inserted into: ${group.name}`)
            }

            // Collect all unique users from groups we actually sent to (exclude test groups)
            const allUserIds = new Set<string>();
            for (const group of groups) {
                const nameLower = (group.name || '').toLowerCase();
                if (nameLower.includes('app testers') || nameLower.includes("noah's test group solo")) continue;
                const { data: members } = await supabase
                    .from('app_group_members')
                    .select('user_id')
                    .eq('group_id', group.id);

                if (members && members.length > 0) {
                    members.forEach(m => {
                        if (m.user_id !== SYSTEM_BOT_ID) {
                            allUserIds.add(m.user_id);
                        }
                    });
                }
            }

            // Get push tokens for all unique users (deduplicated)
            if (allUserIds.size > 0) {
                const { data: tokens } = await supabase
                    .from('app_push_tokens')
                    .select('user_id, expo_push_token')
                    .in('user_id', Array.from(allUserIds));

                if (tokens && tokens.length > 0) {
                    // Deduplicate: one notification per user
                    const seenUsers = new Set();
                    const uniqueTokens = tokens.filter(token => {
                        if (seenUsers.has(token.user_id)) return false;
                        seenUsers.add(token.user_id);
                        return true;
                    });

                    const randomEmojis = ['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'];
                    const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

                    const pushMessages = uniqueTokens.map(t => ({
                        to: t.expo_push_token,
                        sound: 'default',
                        title: 'mmm goood soup!',
                        body: `${randomEmoji} new challenges just dropped!`,
                        data: { type: 'challenge' },
                        channelId: 'default', // Required for Android
                    }));

                    await fetch('https://exp.host/--/api/v2/push/send', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(pushMessages),
                    });

                    console.log(`✅ Sent ${pushMessages.length} deduplicated notifications (${tokens.length} total tokens)`);
                }
            }

            // Mark as sent
            await supabase
                .from('app_scheduled_challenges')
                .update({ status: 'sent' })
                .eq('id', challenge.id);

            console.log(`✅ Challenge ${challenge.id} marked as sent`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: `Sent ${dueChallenges.length} scheduled challenges`,
                count: dueChallenges.length
            }),
            { headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
