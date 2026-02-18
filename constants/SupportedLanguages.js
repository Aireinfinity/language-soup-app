/**
 * Single source of truth: all languages Language Soup supports.
 * Used by: app onboarding (learning), admin create-group, and any "we support X languages" copy.
 *
 * When you approve a language request in the dashboard:
 * 1. Add the new language name here (same format as below).
 * 2. Add translation codes in src/languageUtils.js (getDeepLLangCode / getGoogleLangCode) if we need translation.
 * 3. Create the group in the dashboard (or it gets created by your flow).
 *
 * Count: run SUPPORTED_LANGUAGES.length to see how many we support.
 */

export const SUPPORTED_LANGUAGES = [
    'English', 'Spanish (Español)', 'French (Français)', 'German (Deutsch)', 'Italian (Italiano)',
    'Portuguese (Português)', 'Russian (Русский)', 'Chinese/Mandarin (中文)', 'Japanese (日本語)',
    'Korean (한국어)', 'Arabic (العربية)', 'Hindi (हिन्दी)', 'Bengali (বাংলা)', 'Urdu (اردو)',
    'Turkish (Türkçe)', 'Polish (Polski)', 'Dutch (Nederlands)', 'Swedish (Svenska)',
    'Danish (Dansk)', 'Norwegian (Norsk)', 'Finnish (Suomi)', 'Greek (Ελληνικά)', 'Czech (Čeština)',
    'Romanian (Română)', 'Hungarian (Magyar)', 'Thai (ไทย)', 'Vietnamese (Tiếng Việt)',
    'Indonesian (Bahasa Indonesia)', 'Malay (Bahasa Melayu)', 'Tagalog (Filipino)', 'Hebrew (עברית)',
    'Persian/Farsi (فارسی)', 'Swahili (Kiswahili)', 'Amharic (አማርኛ)', 'Zulu (isiZulu)',
    'Xhosa (isiXhosa)', 'Afrikaans', 'Catalan (Català)', 'Basque (Euskara)', 'Welsh (Cymraeg)',
    'Irish (Gaeilge)', 'Scottish Gaelic (Gàidhlig)', 'Icelandic (Íslenska)',
    'Yoruba (Èdè Yorùbá)', 'Igbo (Asụsụ Igbo)', 'Hausa', 'Somali (Soomaali)', 'Oromo (Afaan Oromoo)',
    'Tigrinya (ትግርኛ)', 'Shona (chiShona)', 'Sesotho', 'Kinyarwanda (Ikinyarwanda)',
    'Mooré (Mòoré)', 'Luganda', 'Wolof', 'Bambara', 'Fulani (Fulfulde)', 'Akan', 'Twi', 'Ewe', 'Fon', 'Lingala', 'Sango',
    'Serbian (Српски)', 'Croatian (Hrvatski)', 'Bosnian (Bosanski)', 'Slovenian (Slovenščina)',
    'Slovak (Slovenčina)', 'Bulgarian (Български)', 'Albanian (Shqip)', 'Macedonian (Македонски)',
    'Ukrainian (Українська)', 'Belarusian (Беларуская)', 'Lithuanian (Lietuvių)', 'Latvian (Latviešu)',
    'Estonian (Eesti)', 'Georgian (ქართული)', 'Armenian (Հայերեն)', 'Azeri (Azərbaycan)',
    'Kazakh (Қазақ)', 'Uzbek (Oʻzbek)', 'Tajik (Тоҷикӣ)', 'Turkmen (Türkmen)', 'Kyrgyz (Кыргызча)',
    'Mongolian (Монгол)', 'Tibetan (བོད་ཡིག)', 'Burmese (မြန်မာ)', 'Lao (ລາວ)',
    'Khmer (ភាសាខ្មែរ)', 'Sinhala (සිංහල)', 'Tamil (தமிழ்)', 'Telugu (తెలుగు)', 'Kannada (ಕನ್ನಡ)',
    'Malayalam (മലയാളം)', 'Gujarati (ગુજરાતી)', 'Punjabi (ਪੰਜਾਬੀ)', 'Marathi (मराठी)',
    'Nepali (नेपाली)', 'Pashto (پښتو)', 'Kurdish (Kurdî)', 'Dari (دری)', 'Quechua (Runasimi)',
    'Aymara', 'Guarani (Avañe\'ẽ)', 'Nahuatl', 'Maya (Mayat\'an)',
    'Navajo (Diné bizaad)', 'Cherokee (ᏣᎳᎩ)', 'Cree', 'Inuktitut (ᐃᓄᒃᑎᑐᑦ)', 'Hawaiian (ʻŌlelo Hawaiʻi)',
    'Maori (Te Reo Māori)', 'Samoan (Gagana Samoa)', 'Tongan (lea faka-Tonga)', 'Fijian (Na vosa vaka-Viti)',
    'Javanese (Basa Jawa)', 'Sundanese (Basa Sunda)', 'Balinese (Basa Bali)', 'Cebuano (Binisaya)',
    'Ilocano', 'Hiligaynon', 'Waray', 'Kapampangan',
    'Esperanto', 'Latin (Latina)', 'Sanskrit (संस्कृतम्)', 'Ancient Greek (Ἑλληνική)', 'Old Norse',
    'Yiddish (ייִדיש)', 'Ladino', 'Maltese (Malti)',
    'ASL (American Sign Language)', 'BSL (British Sign Language)', 'Auslan (Australian Sign Language)',
    'LSF (French Sign Language)', 'DGS (German Sign Language)', 'JSL (Japanese Sign Language)',
    'KSL (Korean Sign Language)', 'CSL (Chinese Sign Language)', 'ISL (Indian Sign Language)',
    'LSE (Spanish Sign Language)', 'LIS (Italian Sign Language)', 'International Sign',
];
