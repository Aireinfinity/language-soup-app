# Home page: next steps (plan)

Notes from Noah (Feb 2026). Quick wins are done; below is the plan for bigger changes.

---

## 1. Daily Challenge card (above Podcast mode)

**Goal:** A big, dynamic "DAILY CHALLENGE" card at the top of the feed so you always start there. Feels like a daily challenge card + community pulse.

**Content (dynamic):**
- Current daily challenge (prompt or summary).
- How many people have done it (community pulse).
- If you've done it: either the card turns into something else (e.g. "You're done — listen below") or we keep it as a status card; Noah is open to either — keep separate from podcast for now.
- So: one card that answers "what's the challenge?" and "how's the community doing?"

**UX:** Card sits above Podcast mode. User always sees it first. Design like a feed card (clear, scannable).

**Open:** Integrate with podcast later (e.g. "done" state turns into podcast CTA) or keep separate; for now keep separate.

---

### 1b. Daily Challenge card — implementation plan (feasibility)

**Data we already have (home screen):**
- `todayChallengePrompt` — today's challenge text (from first challenge in user's groups).
- `todayChallengeStats` — `{ total, responded }`: how many groups have a challenge today, and in how many of those the user has already responded.
- `respondedInLanguagesToday` — which languages they responded in (e.g. for "You did Spanish, French today").

**Data we'd add (one extra query):**
- **Community pulse:** "How many people have done it?" = count of distinct users (or total voice/text replies) who responded to *today's* challenges in the user's groups. Single query: today's challenge IDs → count messages (or distinct sender_id) in `app_messages` for those challenge_ids. Optional; we could ship first with just "You did X of Y groups" and add community count in a follow-up.

**Card content (proposal):**
| State | Card shows |
|-------|------------|
| No challenge today | Hide card, or soft line: "No challenge yet today — check back later." (optional) |
| Challenge exists, user hasn't done it | Prompt (first line or short summary) + "X people have replied" (if we add it) or "Tap a group below to reply" + CTA to scroll / open first group. |
| User did it (responded in ≥1 group) | Status: "You're in — you replied in [Spanish, French]." Optional second line: "N people have replied today." Keep card visible so it stays the "daily challenge" anchor; no need to turn it into podcast CTA yet. |

**Placement:** One card above the green Podcast mode card. Same horizontal padding as the rest of the feed. Styling: same family as podcast card (rounded, clear type) but distinct (e.g. different accent so it doesn't blend).

**Done-state decision:** Plan is to keep the card as a status card when done ("You're in — …") rather than replacing it with "You're done — listen below." We can add a small "Listen to the rest" link that scrolls to or starts podcast later if we want.

**Recommendation:** This is feasible with current data + one optional "community count" query. No need to plan more — we can build the card with prompt + "You did X of Y groups" (and optionally "N replied") and refine copy/UX after it's in.

---

## 2. Podcast mode

**Keep separate from daily challenge for now.**

**Fixes / improvements:**
- **No overlapping audio:** With lag, user can tap multiple times and play several audios. Guard so only one plays at a time (disable play or stop previous when starting next).
- **Overview before diving in:** Show how many unread audios you have across groups + total time (e.g. "12 voice memos · ~4 min") before starting. So you know what you're getting into.
- **Summary at the end:** When you finish the queue, show a short summary (e.g. what you listened to, time spent). Already have end-summary in the podcast plan; ensure it's shipped and visible.

---

## 3. Your groups

**Current issues:** Header ("your groups") is boring. The subheader ("X groups have new messages") was confusing when it said "tap to listen" — looked tappable but wasn't. Cards are good but it's not obvious you can swipe to see more groups.

**Direction:**
- **Quick-glance card on home:** Show a compact "your groups" block — e.g. 2–3 group cards or a single summary card (e.g. "3 groups · 2 with new messages").
- **Full page for all groups:** Add a way to open a dedicated page/screen that lists all groups (no horizontal scroll). So: home = quick glance; "see all" or tap the block = full groups list.
- **Header:** Make it less boring (e.g. "your groups" + "see all" link, or a small visual).
- **Subheader:** Keep it informational only (no fake tap affordance). Done: now "X groups have new messages."

---

## 4. Spoken / listened (done)

- Labels now say "min spoken" and "min listened" so it's clear they're minutes.

---

## 5. Header buttons (done)

- Top-right buttons now have labels: support, request, browse.
