# Antigravity Report: Language Soup Context & Data

> **Generated:** Feb 12, 2026
> **Source:** `CONTEXT.md`, `user_interviews.md`, Dashboard Source Code

This document synthesizes project context, financials, and history to bring new AI agents up to speed.

---

## 1. Spend and Burn Rate 💸

**Note on Data:** Live figures come from the Supabase `app_expenses` table. The dashboard tracks **burn rate only** — no monthly budget limit or cash reserves.

*   **Total Spend:** Dynamically calculated from `app_expenses` (lifetime).
*   **Monthly Burn:** Sum of `monthly` recurring expenses + (`annually` recurring / 12). This is the only financial target tracked in the dashboard.
*   **Revenue:** $0 (Monetization planned for Q3 2026).
*   **Recent Purchases:** e.g. $25 non-recurring for Voice Inc (from conversation history).

---

## 2. Product and Usage Metrics 📊

**Source:** `CONTEXT.md` (Feb 2026 Update) & `GoalsTab.jsx`

### Key Metrics
| Metric | Value | Goal |
| :--- | :--- | :--- |
| **Total Users** | ~150 | 1,000 (Q2) |
| **Active Users (WAU)** | ~20 | 50% Activation |
| **Retention (Day 7)** | 17.2% | 40-50% (Q1) |
| **Launch Date** | Jan 3, 2026 | - |

### Engagement Insights
*   **Voice vs. Text:** Voice messaging is **4x more popular** than text.
*   **Habit Loop:** 0% hit 4-day streak; 11% hit 2-day streak.
*   **Silent Signup:** 62.5% of users never message.
*   **Push Notifications:** 76% of users have active tokens, but click-through rate is unknown (needs PostHog).

### Noah's Time
*   **Schedule:**
    *   **Admin:** ~1 hour/day (Sunrise/Sunset).
    *   **Deep Work:** 4-5 hours/day (Building ONE thing).
*   **Pace:** One bug/feature per day.
*   **Status:** Currently traveling (Europe) until Feb 16, 2026.

---

## 3. Product History & Priorities 📜

### Major Pivots
1.  **Dual Subtitles:** Failed.
2.  **Hungarian Language Journal:** Physical product. Sold ~6 copies. Monetized too early.
3.  **WhatsApp Challenge (7-Day):** **Success.** Proven community demand.
4.  **Native App (Language Soup):** Current iteration (React Native + Expo). Launched Jan 2026.

### Recent "Apology Build" (Feb 9, 2026)
Addressed critical bugs to restore trust:
*   Fixed: Voice memo duration (0s bug), Profile photo crashes, Android UI glitches (white bars, keyboard).
*   New: "Listen Before Send" for voice memos.

### Top Priorities (Now - Feb 2026)
1.  **Retention & Onboarding:**
    *   Ship **"Record Your First Word"** mission (Combat "Silent Signup").
    *   Redesign Profile for DMs.
2.  **Performance:** TTS Reversion + Persistence specific fixes.
3.  **Metrics:** Instrument notification click tracking (PostHog).

---

## 4. Technical Context 🛠️

### Known Technical Debt
*   **Notifications:** Rely on a complex cron + batching system. "Ghost tokens" and duplicate sends have been issues.
*   **Audio:** `expo-av` on Android requires strict cleanup (`stopAndUnloadAsync`) to prevent crashes.
*   **Expo Go:** **DOES NOT WORK.** Must use Dev Build (`npx expo start --dev-client`) due to native modules.

### Tech Stack
*   **Mobile:** React Native (Expo SDK 53).
*   **Backend:** Supabase (Auth, DB, Realtime, Edge Functions).
*   **Dashboard:** React (Vite) hosted on Vercel.
*   **AI:** OpenAI (GPT-4o), Groq (Llama 3), ElevenLabs (TTS).

---

## 5. User Feedback Themes 🗣️

**Source:** `user_interviews.md` (64 entries)

*   **"I'm scared to speak":** Users fear judgment. The app must feel "low stakes" and "not like school."
*   **"I hate Duolingo":** Feels like a chore/game, not real speaking.
*   **Community is the Glue:** "I don't feel alone." Shared struggle > Gamification.
*   **Design Matters:** "Digital Pop Realism" vibe (Cream backgrounds, bold colors) sets it apart from sterile apps.

---

**Link to Dashboard:** [Language Soup Dashboard](https://language-soup-dashboard.vercel.app/) (Admin Access Only)

---

## 6. Tacit Knowledge & Preferences (The "Soft" Context) 🧠

### Decisions & Constraints (Never Again / Always Do)
*   **Design:**
    *   **NO GRADIENTS.** Solid, bold colors only (Digital Pop Realism).
    *   **Backgrounds:** Cream (`#FDF5E6`) > White.
    *   **Vibe:** Must feel "premium" and "alive" (micro-animations, hover effects).
    *   **Imagery:** Use lush colors/symbols, NEVER flags (avoid stereotypes).
*   **Workflow:**
    *   **Customer First:** Customer issues overlap everything. Open tickets > Roadmap.
    *   **Testing:** **NEVER** push blindly. Always test in dev build first (`npx expo start --dev-client`).
    *   **Scope:** One bug/feature per day. Consistency > Speed.
    *   **Simplicity:** AI must propose the *simplest* approach first.

### Working Style (Antigravity's Instructions)
*   **Process:** Align → Simplest Approach → Questions → Approve → Build.
*   **Communication:** Explain tradeoffs first. Don't surprise the user.
*   **Code:** Small, reversible steps. Avoid over-engineering.

### VIP User Context (The "Power Soupers")
*   **Olivia S:** Polyglot, consistency struggles. Suggests "Charades".
*   **Nicki:** Loves "Text Vibe", intimidated by big spaces.
*   **Aurelia:** Connectedness is key. Hates Duolingo speaking.
*   **O'Shack:** Likes "Group workout" vibe (shared struggle).
*   **Christian:** Values the "Low stakes" community.

### Hypothetical Scenarios
*   **If given $50k:** Likely invest in **Video Marketing/Creator Partnerships** (TikTok/Reels) to drive the Q2 goal of 1,000 users.
*   **If time is tight:** Cut features, keep stability. "Change is a feature" (Advisor Joe).
