// Unified translation logic used across ChallengesTab and QueueTab
// Handles DeepL → Google → Hugging Face (for Mooré) cascade

export const translateText = async (text, language, getDeepLLangCode, getGoogleLangCode, supabase) => {
    const deeplLang = getDeepLLangCode(language);
    let googleLang = getGoogleLangCode(language);

    // EMERGENCY FALLBACK: If Utils failed for Mooré, force it here
    if (!googleLang && (language.toLowerCase().includes('moor') || language.toLowerCase().includes('mossi'))) {
        console.warn(`⚠️ FORCE-FIXING MOORE CODE to "mos" for input: "${language}"`);
        googleLang = 'mos';
    }

    console.log(`🔎 [TranslateText] Input: "${language}" | DeepL: ${deeplLang} | Google: ${googleLang}`);

    // Special handling for Mooré: English → French → Mooré
    if (googleLang === 'mos') {
        console.log('🏁 [Mooré Pipeline] Algorithm starting for text:', text);

        try {
            // Step 1: Translate English to French using DeepL
            console.log('🔹 [Mooré Pipeline] Step 1: English → French (DeepL)...');
            const { data: frenchData, error: frenchError } = await supabase.functions.invoke('translate-text', {
                body: { text, targetLang: 'FR' }
            });

            if (frenchError || frenchData?.error) {
                console.error('❌ [Mooré Pipeline] Step 1 Failed:', frenchError || frenchData?.error);
                throw new Error('French translation failed');
            }

            const frenchText = frenchData.translatedText;
            console.log('✅ [Mooré Pipeline] Step 1 Success! French text:', frenchText);

            // Step 2: Translate French to Mooré using Hugging Face
            console.log('🔹 [Mooré Pipeline] Step 2: French → Mooré (Hugging Face)...');
            const { data: mooreData, error: mooreError } = await supabase.functions.invoke('translate-huggingface', {
                body: { text: frenchText, targetLang: 'mos' }
            });

            if (mooreError || mooreData?.error) {
                console.error('❌ [Mooré Pipeline] Step 2 Failed:', mooreError || mooreData?.error);
                throw new Error('Mooré translation failed');
            }

            console.log('✅ [Mooré Pipeline] Step 2 Success! Mooré text:', mooreData.translatedText);
            return mooreData.translatedText;
        } catch (error) {
            console.error('⚠️ [Mooré Pipeline] Entire pipeline failed:', error);
            return text; // Fallback to English
        }
    }

    if (!deeplLang && !googleLang) {
        console.warn('[TranslateText] No DeepL and no Google code for', language, '→ returning English fallback');
        return text; // No translation available, return original
    }

    // Try DeepL first (better quality), IF supported
    if (deeplLang) {
        try {
            const { data, error } = await supabase.functions.invoke('translate-text', {
                body: { text, targetLang: deeplLang }
            });

            if (!error && !data?.error) {
                console.log('[TranslateText] DeepL OK for', language, '→', (data.translatedText?.length ?? 0), 'chars');
                return data.translatedText;
            }
            if (error || data?.error) {
                console.warn('[TranslateText] DeepL failed for', language, '→', error?.message || data?.error, '| trying OpenAI then Google...');
            }
        } catch (deeplError) {
            console.warn('[TranslateText] DeepL exception for', language, '→', deeplError?.message, '| trying OpenAI then Google...');
        }
    }

    // OpenAI translation (same key as pronunciation). Try when DeepL fails so one key can cover both.
    try {
        const { data, error } = await supabase.functions.invoke('translate-openai', {
            body: { text, targetLang: language }
        });
        if (!error && !data?.error && data?.translatedText) {
            console.log('[TranslateText] OpenAI OK for', language, '→', (data.translatedText?.length ?? 0), 'chars');
            return data.translatedText;
        }
        if (error || data?.error) {
            console.warn('[TranslateText] OpenAI failed for', language, '→', error?.message || data?.error, '| trying Google...');
        }
    } catch (openaiError) {
        console.warn('[TranslateText] OpenAI exception for', language, '→', openaiError?.message, '| trying Google...');
    }

    // Google Translate Logic (Fallback for DeepL and OpenAI failures OR languages unsupported by both)
    if (!googleLang) {
        console.warn('[TranslateText] No DeepL and no Google code for', language, '→ returning English fallback');
        return text;
    }
    try {
        const { data, error } = await supabase.functions.invoke('translate-google', {
            body: { text, targetLang: googleLang }
        });

        if (error || data?.error) {
            throw new Error(error?.message || data?.error || 'Google failed');
        }
        console.log('[TranslateText] Google OK for', language, '→', (data.translatedText?.length ?? 0), 'chars');
        return data.translatedText;
    } catch (googleError) {
        console.error('[TranslateText] All translation services failed for', language, '→', googleError?.message, '| returning English fallback');
        return text; // Fallback to English
    }
};
