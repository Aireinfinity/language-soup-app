# Plan: Banners + Standardize Your Soup / Community / Profile Tabs

## 1. Blue banners — same size + do we keep them?

**Current state**
- **Home (Your Soup):** Blue header — `paddingBottom: 14`, radius `16`, `marginBottom: 12`
- **Community:** Blue header — `paddingBottom: 20`, radius `24` (taller and rounder than Home)
- **Profile:** Cream header (no blue)
- **Support:** No blue; header is text + icon on cream

So the “blue banners” are only on **Home** and **Community**, and they’re **not** the same size.

**Option A — Keep blue, make them identical**  
- Use the same header style on both: e.g. `paddingBottom: 14`, radius `16`, `marginBottom: 12` (match Home).  
- Result: Consistent blue strip on Home and Community only.

**Option B — Prefer the “bottom” look (cream, less closing)**  
- You said you might have liked “the bottom one” more — that reads as the **cream tab bar** (or Profile’s cream header).  
- **Recommendation:** Use **cream headers** on Home and Community too (like Profile). Keep one slim bar for title/avatar if needed, but no big blue block. Then the only strong “banner” is the cream tab bar at the bottom, and the app feels more open and less closed in.  
- If you want a tiny bit of brand, we could add a thin blue accent line under the header instead of a full blue block.

**Concrete steps**
1. **If Option A:** In Community, set header to same as Home (`paddingBottom: 14`, `borderBottomLeftRadius: 16`, `borderBottomRightRadius: 16`, `marginBottom: 12`). Leave Profile/Support as is.
2. **If Option B:** Change Home and Community headers to cream (same structure as Profile), optional thin blue bottom border. Tab bar stays cream.

---

## 2. Standardize UX across Your Soup, Community, Profile

**Goal:** Community and Profile should feel like Your Soup: cream everywhere, cards that pop with brand accents, section blocks with title + accent bar, compact spacing, no big empty gap at the bottom when you scroll to the end.

### Your Soup (reference)
- Container: cream.
- Header: blue or cream (per §1).
- Scroll: content in a **wrap** with cream bg, rounded top (e.g. 16), `paddingTop: 12`, tight bottom padding = `TAB_BAR_HEIGHT + insets.bottom + ~24` (no huge empty space).
- Sections: cream blocks, **section title row** (blue accent bar 4px + title).
- Cards: white, rounded, **left border** brand accent (blue/pink/green), light shadow.
- Spacing: sections `marginTop: 16`, block `paddingVertical: 12`, card margins modest.

### Community
- **Header:** Match Home (same size if blue, or cream if Option B). Use same padding/radius/`marginBottom`.
- **Scroll:**  
  - Wrap content in a **scrollContentWrap**-style view: cream, rounded top 16, `paddingTop: 12`.  
  - **Bottom:** `paddingBottom` like Home (e.g. `TAB_BAR_HEIGHT + insets.bottom + 24`) instead of a fixed `100` so there’s no big empty strip when scrolled down.
- **Sections:** Use same pattern as Home: section block (cream), **title row** with blue accent bar + title (e.g. “The Soup Greetings”, “The Soup”, etc.).
- **Cards:** Reuse Your Soup–style card: white bg, rounded (e.g. 16–20), **left border** (e.g. blue for “Chat with a native”, pink for announcements, etc.), same shadow. Keep existing CTAs and content, just unify the card style.
- **Spacing:** Slightly tighter: section `marginTop: 16`, less padding in blocks, card `marginTop`/`marginBottom` similar to Home.

### Profile
- **Header:** Already cream; keep. Optionally use same padding/insets as Home/Community for consistency.
- **Scroll:**  
  - Already has cream and rounded top.  
  - **Bottom:** Reduce `paddingBottom` from `120` to match Home formula (`TAB_BAR_HEIGHT + insets.bottom + 24`) so no large empty space at the end.
- **Sections / cards:** Where there are lists or action blocks, use the same section title row (accent bar + title) and same card style (white + left border accent) so it feels like Your Soup and Community.
- **Spacing:** Slightly tighter bottom spacer (e.g. the `height: 40` at the end) and consistent section spacing.

### Support
- Support is already card/FAQ based. Optional: same section title style and card left-border accent for the main cards so all four tabs feel one system. Lower priority than Community + Profile.

---

## 3. Empty space at the bottom (all tabs)

- **Home:** Already uses `paddingBottom: 24 + TAB_BAR_HEIGHT + insets.bottom` — good.
- **Community:** Change `scrollContent` `paddingBottom` from `100` to `24 + TAB_BAR_HEIGHT + insets.bottom` (import `TAB_BAR_HEIGHT` from `QuestStrip` or use the same number, e.g. 82).
- **Profile:** Change `scrollContent` `paddingBottom` from `120` to `24 + TAB_BAR_HEIGHT + insets.bottom`; reduce or remove the extra `View style={{ height: 40 }}` at the end so the last content sits just above the tab bar with minimal gap.

---

## 4. Implementation order

1. **Banners:** Decide Option A (same-size blue) or B (cream headers). Then implement in Home + Community.
2. **Bottom padding:** Fix Community and Profile scroll bottom padding (and Profile’s extra spacer) so there’s no excess empty space.
3. **Community:** Add scrollContentWrap (cream, rounded top), section title rows with blue accent, and card style (white + left border). Tighten spacing.
4. **Profile:** Align scroll bottom padding; add section title row + card style where it makes sense; tighten spacing.

If you tell me your choice (Option A or B for headers) and that you’re good with this plan, next step is implementing it in the codebase.
