# UX notes

## Pick up here (last session ~Feb 2026)

- **Done:** Full UX principles plan — transcripts (display + Get transcript + voice-feedback persist), spatial consistency (header 16/14, UX_NOTES), nudges (Home “N groups with new messages”, Community “Your community is active”, Chat “Reply with voice?”), explainable buttons (trimmed copy, Support/LanguageRequestModal/Community).
- **Next (when you’re back):** Ship and tell users about transcripts (in-app or release notes). Optional: podcast mode or other screens using transcript when available.

---

## Layout consistency (tabs)

Same frame across **Home**, **Community**, and **Profile** so things stay in the same spot (recognition over recall).

- **Header**
  - `paddingTop`: `insets.top + 16`
  - `paddingBottom`: `14`
  - Cream background, dark text, thin bottom border where used.
  - Title/primary info in the same horizontal band; back or primary action in the same corner (e.g. profile avatar top-left on Home).
- **Primary CTA**
  - Same relative position per tab (e.g. Send/mic at bottom in chat; main actions in the same area on Home and Community).
- **Bottom**
  - Scroll content uses `paddingBottom: 24 + TAB_BAR_HEIGHT + insets.bottom` so the tab bar never covers content.
- **Sections**
  - Main content first, then secondary (e.g. soup kitchen). Section title rows use the same accent bar + title pattern where applicable.

Files: `app/(tabs)/index.jsx` (homeHeader), `app/(tabs)/community.jsx` (header), `app/(tabs)/profile.jsx` (header), `app/(tabs)/support.jsx` (header).
