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
        return text; // No translation available, return original
    }

    // Try DeepL first (better quality), IF supported
    if (deeplLang) {
        try {
            const { data, error } = await supabase.functions.invoke('translate-text', {
                body: { text, targetLang: deeplLang }
            });

            if (!error && !data?.error) {
                return data.translatedText;
            }
            if (error || data?.error) {
                // Throw to catch block to continue to fallback, or validly fallback here?
                // Simple logging here is enough, flow continues to Google below
                // But wait, if we don't return, we need to ensure we don't return undefined.
                // So we continue to the next block.
                console.warn("DeepL failed, falling back...", error);
            }
        } catch (deeplError) {
            console.warn("DeepL excepted, falling back...", deeplError);
            // Swallows error, proceeds to Google
        }
    }

    // Google Translate Logic (Fallback for DeepL failures OR languages unsupported by DeepL)
    try {
        const { data, error } = await supabase.functions.invoke('translate-google', {
            body: { text, targetLang: googleLang }
        });

        if (error || data?.error) {
            throw new Error('Google failed');
        }

        return data.translatedText;
    } catch (googleError) {
        console.error('All translation services failed:', googleError);
        return text; // Fallback to English
    }
};
