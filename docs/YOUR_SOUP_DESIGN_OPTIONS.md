# Your Soup – design directions (pick one, then we refine)

You said you’ll know it when you see it. Here are **four different premises** — not small tweaks. React to the names and one-liners; we can then mock the one you like in the app.

---

## A. Cards for people, list for the rest

- **Hero:** One card at top (daily challenge) — rounded, soft background, clear CTA.
- **Conversations:** Each DM/group is a **card** (avatar, name, preview, time). Feels like “your people” in a grid of faces, not an inbox.
- **More:** Plain list rows (support, request, browse) under a “Soup kitchen” label.
- **Vibe:** Pinterest / “people first.” The spec’s “conversations as cards” — we lean into cards only for hero + people, not for utilities.

---

## B. Big hero, everything else recedes

- **Hero:** Large and friendly — big type and/or one illustration, soft tint. “Daily challenge” feels like the cover of the page.
- **Conversations:** Simple list rows (what we have now) — clean, no cards. Just avatar + name + preview + time.
- **More:** One line: “Support · Request a language · Browse groups” or a single “More” row that expands.
- **Vibe:** One thing dominates (today); the rest is calm, minimal. Magazine cover + quiet list.

---

## C. Feed / social

- **Hero:** “Today” as the first **feed item** — like a post (title + one line + tap). Not a full-width band; feels like a card in a feed.
- **Announcement:** Second feed item (same treatment).
- **Conversations:** Next in the same scroll — cards or rows, same visual language as the items above.
- **Footer:** Thin strip: Support · Request · Browse (text or small pills).
- **Vibe:** Opening a feed. Each block is a “post” or story; scroll is one continuous stream.

---

## D. Dashboard / zones

- **Zone 1:** Today = **compact widget** — one line of copy + one CTA button. Small, clear, not dominant.
- **Zone 2:** “Your conversations” = main content. Could be list rows, or a row of **avatar bubbles** that open to chat (horizontal scroll of “your people”).
- **Zone 3:** Soup kitchen = **3 buttons** (Support, Request, Browse) in a row or small grid. Icon + label each.
- **Vibe:** App home with clear sections. You see “today,” “your people,” “tools” at a glance. No single giant hero.

---

## How to use this

- Reply with a letter (A, B, C, D) or “A but less card-y” / “C but the hero is bigger.”
- We’ll implement that direction in `index.jsx` so you can see it on device and say “closer” or “other way.”
