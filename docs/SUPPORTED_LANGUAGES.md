# Supported languages (one place)

**Single source of truth:** `code/dashboard/constants/SupportedLanguages.js`

That file exports `SUPPORTED_LANGUAGES`: an array of every language name we support. The app (onboarding, create-group) and any "we support X languages" copy should use this list.

**How many we support:** Open `SupportedLanguages.js` and check `SUPPORTED_LANGUAGES.length` (or run it in the app: create-group shows "Language * (N supported)").

**How many languages are actually in use (have at least one group):** In Supabase → SQL Editor run:
```sql
SELECT COUNT(DISTINCT language) AS languages_in_use FROM app_groups WHERE language IS NOT NULL AND TRIM(language) != '';
```
To see the list with group counts:
```sql
SELECT language, COUNT(*) AS group_count FROM app_groups WHERE language IS NOT NULL AND TRIM(language) != '' GROUP BY language ORDER BY group_count DESC;
```

---

## When you approve a language request

1. **Add the language to the list** – Edit `constants/SupportedLanguages.js` and add the new language name (same format as the others, e.g. `'Tamil (தமிழ்)'`).
2. **Translation** – If we need to translate challenges into that language, add the DeepL and/or Google code in `src/languageUtils.js` (see TRANSLATION_PIPELINE.md). Then sync to `send-scheduled-challenges/index.ts` if you use that flow.
3. **Create the group** – In the dashboard (admin), create the group with that language, or your request flow may create it when you mark the request "added."

After that, the new language appears in onboarding, create-group, and anywhere else that reads from `SUPPORTED_LANGUAGES`.
