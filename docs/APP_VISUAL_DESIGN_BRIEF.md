# App visual design brief

Short reference so we design the app (Your Soup, Community, Profile) in one direction. Evolve from current state; don't revert.

---

## Philosophy

**Pinterest × BeReal × Spotify** for language learning.

- **Pinterest:** Visual-first, cards, discovery. Mood over paragraphs.
- **BeReal:** Raw, human, one moment. Imperfect = real.
- **Spotify:** Bold focus, playful copy, clear hierarchy.

Less document-like; more anchored, playful, and community.

- **Language social media / community on your phone:** The app should feel alive — like there's a community on your phone, or a "language stock market" (active, visible, social). Use this when making product and design decisions for Community tab and growth.

---

## Daily challenge card (home hero)

**Show, don't tell.** The card is the one place that tells you "what's happening" without reading paragraphs.

- **Before drop:** Red countdown timer is the hero ("next challenge in 2h 14m") — urgent, visible, no clutter.
- **After drop:** "CHALLENGE DROPPED" as a bold pill (not static text); prompt + who replied (avatars + "replied"), and **1st** badge on the first replier so being first feels good.
- **Status, not copy:** One status pill (not replied / skipped / done) with color; no long nudge sentences.
- **One big signal to act:** When they haven't done it, a **big arrow button** (no words) — clear "go" affordance. When done, "do another" stays text + chevron.

Dark gradient card, minimal words, faces and status over paragraphs. Feels like a feed moment, not a classroom.

**Full Today tab concept (hero + vocab, bite-sized, groups, podcast-style listen):** `docs/TODAY_TAB_DESIGN_CONCEPT.md`.

---

## Tactility

Everything should feel **touchable, scrollable, movable**.

- If it looks like a card or button, it should be **tappable** with clear press feedback (opacity or scale on press).
- If it's a list or grid, it should **scroll** where content overflows.
- Nothing should feel flat or non-interactive — fix elements that aren't "poppable."
- Use **Pressable** (not bare View) for tappable areas; add **hitSlop** where needed; **haptics** on key actions so the app feels physical and responsive.

Audit each tab: anything that looks like it should respond to touch should respond, with feedback.

---

## Community tab — the lifeblood

**Language Soup is a community-based voice memo app. It should feel like language social media. The Community tab is the lifeblood.**

- **What it does:** Where you see who's active, which group chats are buzzing. It's how the app feels alive.
- **Feel:** Lots of **faces**. Lots of **movement**. Lots of **reactions**. **Alive, not static — very dynamic.**
- **North star:** When someone opens the tab they think: *"Wow, this community is alive — and I'm going to contribute to it."*

**Design implications:**
- Lead with **faces** (avatars, who spoke, who's in groups). Horizontal strip of faces, feed of voice bubbles with photos.
- **Movement:** Recency signals ("now", "2m ago"), live-ish cues. Avoid static blocks; favor feed, scroll, activity.
- **Reactions / social proof:** Show that people are reacting and participating (counts, "X soupers", "X voice memos", unread, etc.).
- More **showing** (pictures, audio) and less words. Bold, fun. No accent bars. Voice rows = same style as in-chat (bubble + waveform + play).
- Empty state = one line + one CTA. When there's activity, make it obvious — proof pill, faces strip, recency.
