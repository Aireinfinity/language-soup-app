# Group chat UX comparison & improvements

**Reference:** How Language Soup group chat compares to WhatsApp/iMessage/Telegram and what we've shipped to feel premium and fun.

---

## What we shipped (Feb 2026)

### Quick wins
- **Bubble polish:** Stronger shadow, press scale (0.98) + opacity on tap, snappier long-press (400ms) and light haptic.
- **Sent state:** One check (✓) on your messages once sent; two checks (✓✓) when **seen** (read receipts).
- **Camera in input bar:** Camera icon opens camera; gallery icon for library. Order: Camera · Gallery · Mic.
- **Haptic:** Light haptic when the message action menu opens (long-press).

### Medium
- **Hold to record:** Tap mic = open full recording UI (waveform, trash, send). **Hold** mic ~280ms = start recording; release = send if ≥0.5s, else cancel. Same as WhatsApp-style.
- **Input bar keyboard animation:** When keyboard opens, input bar does a quick scale (1 → 1.02 → 1) so it feels responsive.
- **Skeleton loading:** While messages load, 5 skeleton bubbles (alternating me/them) with a soft pulse instead of a blank screen.
- **New messages pill:** When you've scrolled up and new messages arrive, a pill shows "X new messages"; tap to scroll to bottom.

### Larger
- **Link previews:** If a text message is or contains a single URL, a tappable card shows the domain and "open link" (opens in browser).
- **Read receipts (seen):** We use `app_group_members.last_read_at`. When you open the chat we mark you as read. We fetch other members' `last_read_at` and show two checks (✓✓) on **your** messages when everyone else has read up to that message. (Merged Language Soup feed skips read receipts.)
- **Message list animation:** When the message list grows (new message or send), we run a short layout animation (easeInEaseOut, opacity) so new content doesn’t just pop in.

---

## How we compare to other apps

| Area | WhatsApp / iMessage | Language Soup (after this pass) |
|------|---------------------|----------------------------------|
| Input bar | Camera, gallery, hold-to-record mic | ✅ Camera, gallery, tap or hold mic |
| Sent / seen | ✓ sent, ✓✓ seen | ✅ Same |
| Bubble feel | Shadow, press feedback | ✅ Shadow + scale on press |
| Voice in list | Waveform + play head | ✅ Waveform on playback, smooth live record |
| Link in message | Preview card | ✅ Link card (domain + open), no og:image yet |
| Loading | Skeleton or placeholder | ✅ Skeleton bubbles |
| New messages | "X new messages" when scrolled up | ✅ Same |
| Long-press | Menu + haptic | ✅ Menu + light haptic, 400ms |

---

## Strategy & user voice

- **Strategy (STRATEGY_AND_NOAH):** Social first, dinner party not classroom, speak with real people. The chat is the home; it should feel alive and human.
- **User interviews:** Familiar UI (iMessage-like), low pressure, community feel, design matters (Nandi, Miranda), voice fear (listen-before-send in place). We kept copy and tone playful and lowercase.

---

## Possible next steps (not done yet)

- **Slide to cancel:** While holding to record, sliding finger away shows "Slide to cancel" and cancels on release.
- **Link preview with image/title:** Server-side fetch (e.g. edge function) for og:image and og:title so link cards look richer.
- **Read receipts in merged feed:** Per-group read state for Language Soup feed so "seen" works there too.
- **Delivery state:** "Delivered" (two grey checks) when message is on server, before "seen" (blue).

When you add or change features, update this doc so the comparison stays accurate.
