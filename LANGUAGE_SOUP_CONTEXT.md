# Language Soup - Founder Context

> Last updated: 2026-02-10 (AI TTS Reversion + Performance Fixes)

## 🍲 What is Language Soup?

**One-liner:** A low-pressure voice memo community where you practice speaking languages from Day 1.

**The pitch:** Learn languages together. Speak from Day 1.

**What makes it different:**
- Community-based, not gamified
- Voice memos, not typing
- Low stakes, not stressful
- Async, fits any schedule
- Comprehensible input + translanguaging theory

---

## 👤 About Noah (Founder)

- Solo founder, straight out of college (Fulbright scholarship → Language Soup)
- Living at home, no salary needed, no plans to raise
- Based in: Currently traveling Europe (Dec 20 - Feb 16, 2026)
- Building since: December 2024 (13+ months)
- Lost co-founders: 1 (better solo anyway)
- Morale: Stable 8-9/10 after 6 months of grind

---

## 🚀 Current Focus & Wins (Feb 2026)

**SHIPPED:** "Immersive Daily Challenge" Flow (Feb 5)
- **Problem:** "Backlog Anxiety" & "Friction to Record".
- **Solution:** Zero-friction Pop-up Queue. Always fresh (0 backlog).
- **Vibe:** Digital Pop Realism (White UI, Solid Colors).
- **Goal:** Solve Retention by making the daily habit unmissable and low-stress.

---

## 📊 Current Metrics (Feb 2026)

| Metric | Value |
|--------|-------|
| Total users | ~150 |
| Active users | ~20 (need reactivation!) |
| Retention | 17.2% (goal: 40-50%) |
| Revenue | $0 (by design) |
| Languages supported | 13 |
| Platforms | iOS (TestFlight), Android (Play Store Closed Testing) |

---

## 🎯 2026 Goals

| Quarter | Goal |
|---------|------|
| Q1 | 40-50% retention |
| Q2 | 1,000 users |
| Q3 | First dollar (Stripe pipe) |
| Q4 | $10k MRR Scale |

---

## 🔄 The 4 Pivots

1. **Dual subtitles** - Didn't work
2. **Hungarian language journal** - Physical product, sold ~6 copies, monetized too early
3. **7-day WhatsApp speaking challenge** - WORKED! Community exploded
4. **Native app (Language Soup)** - Current, launched Jan 2026

---
 
## 💡 Top User Insights (from 48+ interviews)
 
> [!NOTE]
> Detailed user interview log available at: [user_interviews.md](file:///Users/Aireinfinity/.gemini/antigravity/brain/7b1248bb-fb5c-4da2-a466-86a1e3c11976/user_interviews.md)
 
| Theme | What Users Say |
|-------|----------------|
| **Speaking anxiety** | "I'm scared to speak because I'll be judged" |
| **Hates Duolingo** | "Feels like school, not real speaking" |
| **Community = motivation** | "I don't feel alone when learning" |
| **Bite-sized** | "10 seconds feels doable" |
| **Low stakes** | "It's not intimidating" |
| **Fun > Work** | "I have classroom trauma" |

**Core value prop (users' words):**
> "A low-pressure community where I can practice speaking without feeling judged"

---
 
## 📊 Data Audit Insights (Feb 2026)
 
| Metric | Discovery | Strategic Result |
|---|---|---|
| **Silent Signup** | 62.5% of users never message | Design **"Record Your First Word"** onboarding mission |
| **Messaging Type**| **Voice is 4x more popular** than text | Double down on voice features; skip text-heavy ones |
| **Habit Loop** | 0% hit 4-day streak, but 11% hit 2-day streak | Shift "Aha! Moment" target to **2 consecutive days** |
| **Engagement** | 76% of users have active push tokens | High potential for reactivation via "Fix-to-Feedback" |
| **Visibility** | 0% data on notification clicks | **Priority 1**: Instrument click tracking (PostHog) |
 
---


**If notifications break:**
- 400 error with "100 character(s)" = Expo limit hit, need batching
- Expo says "ok" but user didn't get it = Check device settings (Notification Summary, Focus Mode)
- Test direct send: `SELECT net.http_post(url := 'https://exp.host/--/api/v2/push/send', headers := '{"Content-Type": "application/json"}'::jsonb, body := '[{"to": "TOKEN", "title": "Test", "body": "Test", "sound": "default"}]'::jsonb);`

**Files:**
- `migrations/FIX_PROD_BATCHING.sql` - The batched version (use this one!)
- `migrations/CREATE_PROD_FUNCTION.sql` - Original (breaks at >100 users)

---

## 🖥️ Admin Dashboard (Critical)

**Location:** `/code/dashboard/` → Deploys to Vercel

**How it works:**
- Dashboard is the **brain** (Noah edits/schedules challenges here)
- Database is the **muscle** (cron job auto-sends at scheduled times)
- Dashboard writes to `app_scheduled_challenges` → Cron reads it and broadcasts

**Main Sections:**

| Tab | What it does | Files |
|-----|--------------|-------|
| **The Castle** | Overview stats, 2026 goals | `App.jsx` (OverviewTab, GoalsTab) |
| **The Kitchen** | Daily challenges, live feed | `ChallengesTab.jsx`, `QueueTab.jsx`, `LiveFeedTab.jsx` |
| **Fire Station** | Support tickets, user directory | `SupportTabSimplified.jsx`, UsersTab in `App.jsx` |
| **The Garden** | Marketing, growth charts | `MarketingTab.jsx`, `GrowthCharts.jsx` |
| **Finances** | Hidden admin finances | `FinancesTab.jsx` |

**Daily Challenges Tab (Feb 2026 Update):**

- **Daily Pulse** 🩺 - Quick health check at top: Today's status, Queue coverage, Pending count
- **Calendar View** 📅 - 60-day visual grid (yellow=pending, green=approved, click to edit)
- **Prompt Ideas** 💡 - 25+ ideas in pool, 6 random shown, click one → replaces with fresh idea
- **Recently Sent** ⚠️ - Shows last 3 challenges to avoid repetition
- **Edit Modal** - Click any calendar day → edit time/text, approve, delete

**Challenge Flow (The Kitchen):**

1. **Create challenge** in QueueTab → saved to `app_scheduled_challenges` with status `pending`
2. **Preview translations** → DeepL/Google Translate auto-translates to all group languages
3. **Approve challenge** → status changes to `approved`
4. **Cron job sends** at scheduled time → status changes to `sent`, messages inserted into all groups

**Key Tables:**
- `app_scheduled_challenges` - Queue of challenges (pending/approved/sent)
- `app_challenges` - Actual sent challenges in groups
- `app_messages` - All messages (including challenge responses)
- `app_groups` - Language groups
- `challenge_performance_log` - AI learning data for response prediction

**Files:**
- `QueueTab.jsx` - Main challenge creation/editing UI (Daily Pulse, Calendar, Prompt Ideas)
- `LiveFeedTab.jsx` - Real-time message feed across all groups
- `soupPredictor.js` - AI that predicts response rates based on past challenges
- `translationHelper.js` - DeepL + Google Translate fallback logic

---

## 🗓️ Current Focus (Next 3 Weeks)

| Week | Focus |
|------|-------|
| Jan 25-30 | **Skiing in Austrian Alps** - no building |
| Jan 31 - Feb 7 | **Budapest coffee chats** - chill coffee chats with founders and investors, catch up on what didn't work in the alps
| Feb 7-16 | **Travel home** - light support only |
| Feb 10+ (Now) | **Retention & Onboarding**. Ship **"Record Your First Word"** mission (Task #9). Redesign Profile for DMs. **Performance** (TTS Reversion + Persistence). |

---

## 📝 Content Strategy: The 3-Pillar Rotation

> [!NOTE]
> Detailed social strategy and idea bank available at: 
> - [social_media_pillars.md](file:///Users/Aireinfinity/.gemini/antigravity/brain/7b1248bb-fb5c-4da2-a466-86a1e3c11976/social_media_pillars.md)
> - [content_idea_bank.md](file:///Users/Aireinfinity/.gemini/antigravity/brain/7b1248bb-fb5c-4da2-a466-86a1e3c11976/content_idea_bank.md)
 
1. **The Hook (Daily Challenges)**: Noah + App Screenshot. Builds habit/trust. (4/week)
   - *Hook Idea:* "Everyone in the soup is failing today's challenge... can you do better?"
2. **The Vibe (Polyglot Diary)**: Noah traveling/living in multiple languages. Builds aspiration. (2/week)
   - *Hook Idea:* "How I use 3 languages to survive a day in Budapest without a textbook."
3. **The Spark (Anti-School Rants)**: Calling out the failures of traditional learning. Targets "Classroom Trauma." (1/week)
   - *Hook Idea:* "Stop trying to conjugate reflexive verbs. It's killing your progress."
 
- **Style:** Raw, authentic, walking/talking > over-edited memes.
- **Goal:** 1 video/day across TikTok/Reels/LinkedIn.
- **Tactics:** 3-second hook rule; use "translanguaging" in captions.

---

## 🎨 Design Vibe (The "Language Soup Aesthetic")

**Core Identity:** 2016 Pop / Disco / Pinterest / BeReal.
- **Keywords:** Vibrant, Authentic, Glossy (Subtle), Punchy.
- **NOT:** Corporate, Tech-Minimalist, Gradient-heavy, Abstract.

**Visual Language:**
- **Background:** Cream (`#FDF5E6`) - Warm, paper-like, not clinical white.
- **Colors:** Bold CMYK-style Pop. Turquoise (`#00ADEF`) & Pink (`#EC008B`).
- **Typography:** Bold, clean, accessible.
- **Imagery:** No flags (avoid stereotypes). Use lush colors/symbols instead.

**Current Direction (Feb 2026) - SHIPPED:**
- **Immersive:** Full-screen solid colors (No gradients!).
- **Clarity:** White text/waveforms on EVERYTHING. High contrast.
- **Vibe Check:** "Digital Pop Realism". Feels like a music video or a fashion magazine.
- **Copy:** Randomized & Fun ("Soupers", "Get Soupy").
- **Constraint:** Zero "Backlog Anxiety" (Old challenges disappear).

---

## 🧘 Personal Notes

- Finished The Artist's Way (12 weeks) - learning to rest
- Artist dates = good for creativity
- Less user calls = lower morale (user calls = fuel)
- One bug/feature per day = sustainable pace
- 7-person founder community helps with loneliness

---

## 🗓️ Weekly Anchors & Daily Flow

**Weekly Anchors (Non-negotiables):**
- **Tues @ 9am:** LinkedIn "Build in Public" Post
- **Fri @ 10am:** YC Weekly Update
- **Daily @ 11am:** Post TikTok/IG (Batch created previously)

**Daily Flow (Protecting Deep Work):**
1. **Admin Sunrise (30m):** Emails, Support, Discord. Then CLOSE TABS.
2. **Deep Work (4-5h):** Build ONE thing. Phone away.
3. **Admin Sunset (30m):** Inbox zero, plan tomorrow's "One Thing".

---

## �️ How We Build (AI Workflow)

**BEFORE building anything, always follow this process:**

1. **Align** - Discuss what we're building and why
2. **Simplest approach** - AI proposes the simplest possible solution
3. **Questions** - AI asks Noah any clarifying questions BEFORE coding
4. **Approve** - Noah approves the approach
5. **Build** - Only then do we write code

**Why this matters:**
- Saves model tokens (we have limited usage)
- Prevents scope creep
- Faster than "okay okay okay" back-and-forth
- No surprises

**Rules:**
- **Customer issues ALWAYS come first.** Open tickets > planned features.
- **Test everything in the dev server before pushing.** No blind pushes. Start with: `npx expo start --dev-client --tunnel --scheme languagesoup`
- Don't over-engineer. Simple > clever.
- One bug/feature per day is the pace.
- Ask questions first, code second.
- If unsure, ask Noah.
- No unnecessary rebuilds or deployments.

**Feature Development Cycle:**
1. **Design Simply** - Start with the simplest user flow.
2. **Build Simply** - Implement the core logic (MVP).
3. **Test** - Avoid crashes & ensure speed:
   - **Accuracy:** Does it work as expected?
   - **Performance:** Does it load quickly?
   - **Stability:** No crashes on iOS/Android.
4. **Deploy** - Only push from Development to Production once verified.

---

## �📋 How to Update This File

1. Edit this file locally or on GitHub
2. Update the "Last updated" date at the top
3. Change metrics, focus, and personal notes as needed
4. Commit and push: `git add . && git commit -m "Update context" && git push`

---

## 📱 Dev Build Testing (Critical)

**Why Expo Go doesn't work:**
- Push notifications not available (SDK 53+)
- Native audio modules require dev build
- expo-secure-store requires dev build

**Dev builds expire after 7 days!** Rebuild when needed:
```bash
cd /Users/Aireinfinity/Desktop/language-soup/code/dashboard
eas build --platform ios --profile development
eas build --platform android --profile development
```

**Dev Server (The ONLY Command That Works):**
```bash
npx expo start --dev-client --tunnel --scheme languagesoup
```
- `--dev-client` uses the custom dev build (not Expo Go)
- `--tunnel` bypasses WiFi/firewall issues
- `--scheme languagesoup` makes QR codes work with the dev build

**If phone still can't connect:**
1. Make sure phone & Mac are on same WiFi
2. Turn off VPN on both devices
3. Scan QR with phone's Camera app (not a scanner inside the dev build)

---

## 📎 Links

- Website: [language-soup.com](https://language-soup.com)
- Instagram: [@languagesoup](https://instagram.com/languagesoup)
- TikTok: [@language.soup](https://tiktok.com/@language.soup)
- YC Weekly Updates: (paste latest here each week)

---

*This file exists so Noah doesn't have to re-explain the pivots, monetization timeline, or context every time. Just read this and we're good.*

## 📜 History / Changelog

### Feb 9, 2026 - The "Apology Build" (Ticket Blitz) 🍜
- **Objective:** Fix 8 critical bugs/UX issues reported by users in < 24h to restore trust.
- **Shipped:**
  1. ✅ **Listen Before Send** (Voice Memos)
  2. ✅ **Voice Memo Duration Fix**
  3. ✅ **Profile Photo Crash Fix**
  4. ✅ **Android White Bar Fix** (Transparent Nav)
  5. ✅ **Android Keyboard Input Fix**
  6. ✅ **Photo Upload Fix**
  7. ✅ **iOS Keyboard Layout Fix**
  8. ✅ **Emoji Reactions** (Fixed + Simplified UX)
- **Status:** Deployed via EAS to TestFlight (iOS) and Android (Promoted to Open Testing).

### Feb 10-11, 2026 - Onboarding & Community Refinement 🍲🌍
- **Objective:** Transformation of the "New Chef" experience and stabilizing core audio features.
- **Shipped:**
  1. ✅ **Audio Safety Check:** Resolved "Only one Recording object" crashes by implementing global `stopAndUnloadAsync` safety hooks.
  2. ✅ **"Favorite Word" Onboarding:** Pivoted from "Anxiety" to a humorous "Favorite Word" prompt (curse words encouraged!).
  3. ✅ **New Chef Badges:** Redesigned prominent red **"NEW 🍲"** badges on the top-left diagonal of search cards.
  4. ✅ **Photo Prioritization:** Sorting logic now ranks real human photos above avatars to increase community authenticity.
  5. ✅ **Noah Clean-up:** Filtered out duplicate founder profiles; only verified identities remain.
- **Learnings:**
  - **Expo-AV Scoping:** Audio recording objects in SDK 53+ require absolute cleanup during every `startRecording` attempt to avoid prepare state collisions.
  - **StyleSheet Constants:** Common theme objects (e.g., `SOUP_COLORS`) used in `StyleSheet.create` must reside in **module scope** (top-level) to be accessible during the static style evaluation phase in React Native.
  - **Human-Centric UX:** Highlighting human faces over avatars increases "Community Embrace" vibe (Retention metric).
