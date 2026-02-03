# Language Soup - Founder Context

> Last updated: 2026-02-03 (Viral share deep link for user reactivation)

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

## 📊 Current Metrics (Feb 2026)

| Metric | Value |
|--------|-------|
| Total users | ~150 |
| Active users | ~20 (need reactivation!) |
| Retention | 17.2% (goal: 40-50%) |
| Revenue | $0 (by design) |
| Languages supported | 13 |
| Platforms | iOS (TestFlight), Android (Play Store internal) |

---

## 🎯 2026 Goals

| Quarter | Goal |
|---------|------|
| Q1 | 40-50% retention |
| Q2 | 1,000 users |
| Q3 | First dollar (premium feature) |
| Q4 | Reevaluate |

---

## 🔄 The 4 Pivots

1. **Dual subtitles** - Didn't work
2. **Hungarian language journal** - Physical product, sold ~6 copies, monetized too early
3. **7-day WhatsApp speaking challenge** - WORKED! Community exploded
4. **Native app (Language Soup)** - Current, launched Jan 2026

---

## 💡 Top User Insights (from 47+ interviews)

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

## ✅ What's Working

- Daily challenges (automated, batched weekly)
- Voice memo format (async, low pressure)
- Community vibes (people making friends)
- App design (everyone compliments it)
- TikTok content (growing views daily)
- Support via text (personal touch)
- The Artist's Way principles (rest = productive)
- **Viral Share page** (challenge links with "Already have the app?" deep link for reactivation)

---

## ❌ What's Not Working / Pain Points

- Android crashes (ongoing)
- Notifications: Fixed Jan 31 (batching for >100 users) - see Notification System section
- Scope creep when building
- Too many SQL audit files in repo (cleanup needed)
- No premium features yet (need one before App Store launch)

---

## 🎨 Brand

**Colors:**
- Sky blue: #00adef
- Magenta: #ec008b
- Teal: #19b091
- Cream: #FDF5E6

**Terminology:**
- Users = "Soupers"
- Goodbye = "Happy Souping!"
- Avatars = "Soup Avatars" or "Human Soups"

---

## 📱 Tech Stack

- **Mobile:** React Native (Expo)
- **Backend:** Supabase (Pro plan)
- **Dashboard:** Vercel (free plan)
- **Notifications:** FCM v1 (iOS + Android)
- **AI:** HuggingFace, Llama 3, DeepL for translations
- **Voice:** ElevenLabs (testing)

---

## 🔔 Notification System (Critical)

**Architecture:**
- Cron job runs every minute → calls `process_scheduled_challenges_PROD()` SQL function
- Function inserts challenges into groups, then sends push notifications via `net.http_post` to Expo

**Key Limits:**
- ⚠️ **Expo limit: 100 notifications per request** - Function MUST batch in groups of 100
- Current users with notifications: ~109 (and growing)

**Key Insight (Feb 1, 2026):**
- ⚠️ **Expo "ok" ≠ User saw it** - iOS Notification Summary, Focus Mode, or disabled notifications can block delivery even when Expo+Apple say "delivered"
- If a user reports not getting notifications, check their DEVICE SETTINGS first
- We cannot detect device-level blocking from the server side

**Debugging Checklist:**
1. Check cron is active: `SELECT * FROM cron.job WHERE command LIKE '%process_scheduled%';`
2. Check HTTP responses: `SELECT status_code, content FROM net._http_response ORDER BY created DESC LIMIT 5;`
3. Check if batching is active: `SELECT CASE WHEN routine_definition LIKE '%batch_count%' THEN '✅ BATCHED' ELSE '❌ NOT BATCHED' END FROM information_schema.routines WHERE routine_name = 'process_scheduled_challenges_prod';`
4. Verify delivery with receipts: `SELECT net.http_post(url := 'https://exp.host/--/api/v2/push/getReceipts', headers := '{"Content-Type": "application/json"}'::jsonb, body := '{"ids": ["TICKET_ID_HERE"]}'::jsonb);`

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
| Jan 31 - Feb 7 | **Budapest coffee chats** - user interviews |
| Feb 7-16 | **Travel home** - light support only |
| Feb 17+ | **Ship:** Voice feedback, sample phrases, DMs |

---

## 📝 Content Strategy

- **TikTok:** 1 video/day (testing, growing views)
- **Instagram:** Repost from TikTok
- **LinkedIn:** 1 post/week (build in public)
- **Style:** Raw, authentic > polished

---

## 🧘 Personal Notes

- Finished The Artist's Way (12 weeks) - learning to rest
- Artist dates = good for creativity
- Less user calls = lower morale (user calls = fuel)
- One bug/feature per day = sustainable pace
- 7-person founder community helps with loneliness

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
- Don't over-engineer. Simple > clever.
- One bug/feature per day is the pace.
- Ask questions first, code second.
- If unsure, ask Noah.
- No unnecessary rebuilds or deployments.

---

## �📋 How to Update This File

1. Edit this file locally or on GitHub
2. Update the "Last updated" date at the top
3. Change metrics, focus, and personal notes as needed
4. Commit and push: `git add . && git commit -m "Update context" && git push`

---

## 📎 Links

- Website: [language-soup.com](https://language-soup.com)
- Instagram: [@languagesoup](https://instagram.com/languagesoup)
- TikTok: [@language.soup](https://tiktok.com/@language.soup)
- YC Weekly Updates: (paste latest here each week)

---

*This file exists so Noah doesn't have to re-explain the pivots, monetization timeline, or context every time. Just read this and we're good.*
