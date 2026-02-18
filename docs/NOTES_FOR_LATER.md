# Notes for later

Ideas and reminders we don't want to forget. Pick up when relevant.

---

## App testers group

**Current:** We exclude "app testers" and "noah's test group solo" from scheduled challenge sends so they don't get daily challenges. They're still real groups in the app.

**Ideas for better using the app testers group:**

- **Noah:** Be more active in the group; ask them to test new features before wider rollout.
- Use it as a **canary** for new features (e.g. ship to app testers first, then roll out).
- **Solicit structured feedback** after releases (short survey or pinned prompt: "What broke? What felt off?").
- **Early access** to betas or new languages; they get to try first and report.
- Keep a **list of who's in it** so we can tag them in the "User tiers" in user_interviews.md and reward them later (merch, thank-you, early perks).

---

## User tiers and rewarding early supporters

See **user_interviews.md** → "User tiers (who was there when)". Tiers: first on the app, power users, voluntary beta testers, public. Goal: remember them and do something tangible (merch, exclusive access, thank-you) when we can.

---

## Dashboard design (build 31 inspiration)

Noah loved the design from **build 31** and wants to channel that into a dashboard redesign, especially the **daily challenges tab**. When doing a redesign, reference build 31 for look and feel. Castle: soupers total (excluding test), active 7d, active %, groups, languages in use, growth timeline, Q1 goal, viral shares, yearly goals. Kitchen: challenges, groups & requests, live feed (all easy to reach). Fire station = 24/7 in-app chat first; get it on his phone.

---

## 24/7 chat on phone (fire station)

**Goal:** Users text Noah on the app, not WhatsApp/iMessage. He needs the support/chat backend to be really good and **on his phone with notifications** so he doesn't miss messages. Right now he misses notifications and that's bad. Fire station copy and UX should emphasize: 24/7 in-app chat, get it on your phone.

---

## Support inbox zero (Tyler Dank / Beehive)

Noah wants a **better system** for support tickets so they don't pile up. Tyler Dank (Beehive) does **inbox zero every week**. Look into workflows (e.g. triage, close/archive, reply templates, weekly reset) so tickets don't pile up.

---

## "Text Noah" — simple 24/7 chat (no ticket complexity)

**What Noah wants:** Just "text Noah." One place, he gets notifications, they're texting. Support tickets feel too complicated. He wants to talk to people simply; when someone says something that matters (feature idea, bug, feedback), he can jot it down later: support ticket, feature request, or user interviews.

**Best approach:** One simple **in-app "Text Noah"** (or Soup Support) chat. Users send messages; Noah gets notifications. No need for a separate "24-hour chat" product — the existing support/conversation flow is the 24/7 channel. Keep it one thread per user (or one group). When he reads something worth following up on, he can: star it, copy to a ticket, or add to user_interviews.md / feature backlog. So: (1) Make the dashboard Fire Station **Chat first** (already done). (2) Push notifications to his phone when users message (so he doesn't miss them). (3) Optional: "Promote to ticket" or "Add to feedback" on a message so he can triage without leaving the chat. Keep it simple: text Noah, get notified, triage when he has time.

---

## Dashboard login (single admin, no random user)

Noah is the only admin. He doesn't want to log in every time; anonymous login was creating a **new random user** each time. **Done:** Reuse existing session on login (if already have an admin session, don't call signInAnonymously again). **Stay on the same browser** so the session persists. For one permanent account with no login prompt, he could switch to **email magic link** or **password** for his admin user so one stable identity; then session persists across devices when he signs in with that email.
