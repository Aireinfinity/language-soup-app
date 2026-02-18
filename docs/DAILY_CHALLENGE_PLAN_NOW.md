# Daily challenge: plan right now

**Context:** It was working ~99%. Translation broke (we fixed: DeepL auth + keys). You're using that to simplify and fix the 3am problem (your mom, Europe, Brazil, Philippines, US). We're not overcomplicating – we're fixing translation, adding timezone so sends are at a good local time, and making the flow "set and leave."

**What you want (keep it simple):** Simple, accurate translations. A time that's good for people. Constantly learning. You manage it, you don't run it. Calendar view so you have control at a glance (today, tomorrow, couple months out, holidays visible). You pick the challenges – we can suggest, but you have final approval on what people actually talk about (you're the language person).

---

## Simplify the code

The code is overcomplicated. As we fix and build, we simplify: one translation path, one clear send flow, one calendar/queue model. No extra branches, no "just in case" logic. Simple, accurate translations; good time for people; learning loop; you manage, you don't run.

---

## What we're doing (in order)

1. **Translation (done / in progress)**  
   - DeepL header auth fixed, translate-text redeployed.  
   - Optional: add `language_code` to groups + single translate path so adding languages is trivial.  
   - **You:** Nothing. Add to queue works again; batch as you did before.

2. **User timezone**  
   - Store timezone on user (e.g. `America/New_York`).  
   - Get it once: onboarding or "where do you live?" or device default. Existing users: one-time ask or default from device.  
   - **You:** Nothing in dashboard. We add the field and the ask in the app.

3. **Send at good local time (not 3am)**  
   - Cron runs every X minutes. For each user: "Is it a good time in their timezone (e.g. 8am–10pm local)?" If yes and we haven't sent today's challenge yet, send notification (challenge is already posted once per group).  
   - One post per group per day; notifications staggered by timezone.  
   - **You:** Nothing. Sends happen automatically at good times.

4. **Dashboard: what you see and do**  
   - **Queue tab (like now, maybe cleaner):** Your list of approved challenges. You add prompts, "add to queue," translations run. You can reorder, remove, or edit any row.  
   - **"What's going out" block:** At the top or side: "Tomorrow: [prompt text]" and "Next 7 days: [list]." So you always know what's next without digging.  
   - **Timezone preview (optional):** "Send windows: US-East ~9am, Europe ~10am, Brazil ~8am, Philippines ~7pm" (or similar) so you see when it'll land in different places.  
   - **Edit when you want:** Click a day or a challenge → edit text or swap for a holiday. Save. No daily "run" or "approve" step.

5. **Holidays / special days (later)**  
   - Preloaded calendar (Valentine's, New Year's, etc.) + pool of prompts; system picks when it's that day. You can override by editing that day in the queue.  
   - **You:** Preload once or when we build it; occasionally edit one day (election, etc.).

---

## What you have to do (and how often)

| What | How often | What you do |
|------|-----------|-------------|
| **Batch challenges** | Once a month (or when you feel like it) | Add prompts to queue, approve. Translations run. Queue is set. |
| **Check "what's going out"** | Whenever you want | Open dashboard; see "Tomorrow" and "Next 7 days." No action needed. |
| **Edit a day** | Rarely (holiday, event, oops) | Click the day or challenge, change text or swap, save. |
| **Daily ops** | Never | You don't run sends, approve daily, or "release" anything. System does it. |

So: **you batch when you want (e.g. monthly). You check when you're curious. You edit when something special comes up. You never have to "run" it day to day.**

---

## How the dashboard looks (concrete)

- **Calendar view = primary.** You liked it. At a glance: today, tomorrow, and a couple months out. Holidays visible so you can see "Valentine's coming up" and edit if you want. That's your control panel. We keep it or bring it back front and center.
- **Queue / list** for adding and reordering challenges. When you add, they land on the calendar. Simple.
- **"What's going out":** Tomorrow and next 7 days visible (in calendar or a small summary). Optional: "When it goes out" by region (US ~9am, Europe ~10am, etc.).
- **Edit:** Click a day on the calendar (or a row) → change prompt or swap → save. No extra steps.

So: **calendar first** (today, tomorrow, months out, holidays). Queue to add/reorder. You manage at a glance; you don't run anything daily.

**Prompts: final approval is yours.** We can suggest or auto-generate prompts we think are good, but nothing goes to the queue / calendar without your approval. You're the language person; you decide what people actually talk about.

**Holidays and special days: highlighted.** On the calendar, holidays and special days (Valentine's, St. Patrick's, Easter, solstice, eclipse, etc.) are **highlighted** so you see "what's coming up" at a glance. You can look and think: is that a good prompt for my community? You're the community manager; we're operations (data, prediction, run the sends). You say yes or no; we run it.

---

## What "know what's going on" means (without having to do things)

- You **can** open the dashboard and see: tomorrow's prompt, next 7 days, and (if we add it) when it'll land in different regions. So you're never in the dark.
- You **don't have to** open it every day, run a process, or approve anything for today. You only come back when you want to batch more, check the queue, or edit a day.

So: **visibility when you want it; no required daily check.**

---

## Summary

- **Plan:** Fix translation (done). Add timezone. Send at good local time (one post, many notification times). Dashboard: same queue + "what's going out" + optional timezone preview + edit when you want.
- **You do:** Batch challenges when you want (e.g. monthly). Check "what's going out" when you're curious. Edit a day when needed (holiday, etc.). Nothing daily.
- **You don't do:** Daily runs, daily approval, or guessing when things go out. The system sends at good local times; you see what's next whenever you look.

---

## Build status (what's done)

- **Translation:** DeepL header auth, translate-text redeployed. Extended DeepL codes (Farsi, etc.) in dashboard.
- **Dashboard:** Calendar with holidays/special days highlighted (pink ring + label). "What's going out" block: tomorrow + next 7 days + timezone preview line. Queue and edit unchanged.
- **Schema:** Migration `20260221_timezone_delivery_tracking.sql`: `app_users.timezone`, `challenge_user_deliveries`, `challenge_group_posts` for timezone-aware send. Run when ready: `supabase db push` or apply migration.
- **Send logic:** Current cron still sends at scheduled_time (one time for everyone). Timezone-aware send (good local window, one post per group, staggered notifications) uses the new tables; implementation is the next step when you want to switch.
- **Local dev:** `npm run dev` in `code/dashboard` runs the dashboard at http://localhost:5173/ for UX review. Then `npm run build` and deploy to Vercel for production.
