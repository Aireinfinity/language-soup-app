// Shared language code mappings for DeepL and Google Translate APIs

export const getDeepLLangCode = (groupLanguage) => {
    const lang = groupLanguage.toLowerCase();
    // European languages
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

    // Asian languages
    if (lang.includes('russian') || lang.includes('русский')) return 'RU';
    if (lang.includes('japanese') || lang.includes('日本語')) return 'JA';
    if (lang.includes('chinese') || lang.includes('中文') || lang.includes('mandarin')) return 'ZH';
    if (lang.includes('korean') || lang.includes('한국어')) return 'KO';
    if (lang.includes('indonesian') || lang.includes('bahasa')) return 'ID';
    if (lang.includes('turkish') || lang.includes('türkçe')) return 'TR';
    if (lang.includes('arabic') || lang.includes('العربية')) return 'AR';
    // Extended DeepL support (incl. Persian/Farsi, Hindi, Hebrew, Vietnamese, Thai, Tagalog, etc.)
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

    // Note: DeepL doesn't support Mooré and some others. If null, will fallback to Google (or Mooré pipeline)
    return null;
};

export const getGoogleLangCode = (groupLanguage) => {
    const lang = (groupLanguage || '').toLowerCase();
    // English: we don't translate to English (source is English), so no code needed
    if (lang === 'english') return null;
    // European languages
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

    // Asian languages
    if (lang.includes('russian') || lang.includes('русский')) return 'ru';
    if (lang.includes('japanese') || lang.includes('日本語')) return 'ja';
    if (lang.includes('mandarin')) return 'zh-CN';
    if (lang.includes('cantonese')) return 'zh-TW'; // Traditional Chinese
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

    // African languages
    if (lang.includes('swahili') || lang.includes('kiswahili')) return 'sw';
    if (lang.includes('yoruba')) return 'yo';
    if (lang.includes('zulu')) return 'zu';
    if (lang.includes('afrikaans')) return 'af';

    // Generic check for Mooré (Robust for both NFC and NFD)
    // "Mooré" contains "moor", "Moore" contains "moor"
    if (lang.includes('moor') || lang.includes('mossi')) return 'mos';

    // Explicit variations (just in case)
    if (lang.includes('mooré') || lang.includes('moore') || lang.includes('mossi')) return 'mos';

    // Other languages
    if (lang.includes('hebrew') || lang.includes('עברית')) return 'iw';
    if (lang.includes('persian') || lang.includes('فارسی') || lang.includes('farsi')) return 'fa';
    if (lang.includes('urdu') || lang.includes('اردو')) return 'ur';

    // Smart fallback: Try to extract first word as language code
    // This handles new languages automatically!
    // Example: "Swahili #beginner" -> "sw", "Hindi" -> "hi"
    const firstWord = lang.split(/[\s#]/)[0].trim();

    // Common language name to code mappings for auto-detection
    const autoDetect = {
        'bengali': 'bn',
        'gujarati': 'gu',
        'kannada': 'kn',
        'malayalam': 'ml',
        'marathi': 'mr',
        'punjabi': 'pa',
        'tamil': 'ta',
        'telugu': 'te',
        'nepali': 'ne',
        'sinhala': 'si',
        'khmer': 'km',
        'lao': 'lo',
        'burmese': 'my',
        'amharic': 'am',
        'hausa': 'ha',
        'igbo': 'ig',
        'somali': 'so',
        'cebuano': 'ceb',
        'javanese': 'jw',
        'sundanese': 'su',
        'uzbek': 'uz',
        'kazakh': 'kk',
        'azerbaijani': 'az',
        'georgian': 'ka',
        'armenian': 'hy',
        'albanian': 'sq',
        'macedonian': 'mk',
        'icelandic': 'is',
        'welsh': 'cy',
        'irish': 'ga',
        'scots': 'gd',
        'basque': 'eu',
        'catalan': 'ca',
        'corsican': 'co',
        'maltese': 'mt',
        'mooré': 'mos',
        'moore': 'mos',
        'mossi': 'mos',
        'kyrgyz': 'ky',
        'montenegrin': 'sr'
    };

    if (autoDetect[firstWord]) {
        console.log(`🔍 Auto-detected language code for "${groupLanguage}": ${autoDetect[firstWord]}`);
        return autoDetect[firstWord];
    }

    console.warn(`⚠️ No Google Translate code found for language: "${groupLanguage}"`);
    return null;
};

