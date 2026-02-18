# Antigravity Build Stats

**One doc for all Antigravity data:** session stats, when Noah builds (days/hours), deep-work patterns, and how to refresh. Stats are from `~/.gemini/antigravity/brain/` file timestamps (earliest → latest file change per session). *How to refresh:* see bottom of this doc.

## 1) LAUNCH SPRINT: Dec 13, 2024 – Jan 6, 2026
*(First recorded session found: Dec 03, 2025)*

- **Total Hours:** ~393 hours (392h 52m)
- **Session Count:** 46 sessions
- **Average Intensity:** ~79 hours/week (during active period Dec 03 – Jan 06)
- **Date Range:** Dec 03, 2025 – Jan 06, 2026

## 2) ALL-TIME: First Session – Present
*(Dec 03, 2025 – Feb 15, 2026)*

- **Total Hours:** ~831 hours (830h 49m)
- **Session Count:** 68 sessions
- **Average Intensity:** ~76 hours/week
- **Date Range:** Dec 03, 2025 – Feb 15, 2026

---

## 3) When Noah Builds (Day & Hour Breakdown)

Historical session time from `brain/` file mtimes (when artifacts were written). Timezone = local. *Run `scripts/antigravity-session-breakdown.sh` to refresh.*

**Sessions:** 84 | **Total estimated time:** 830h

### By day of week (session time)

| Day | Hours |
|-----|-------|
| Sun | 36h 37m |
| Mon | **201h 51m** |
| Tue | 22h 05m |
| Wed | **111h 38m** |
| Thu | **327h 12m** |
| Fri | 53h 51m |
| Sat | 77h 33m |

**Summary:** You build most on **Thursday** (327h), then **Monday** (202h), then **Wednesday** (112h). Sunday is lowest (37h) — matches your "Sunday = rest" rule. Tuesday and Friday are relatively light (anchors: LinkedIn Tue, YC Fri).

### By hour of day (session start activity; local time)

| Hour | Hours | Hour | Hours |
|------|-------|------|-------|
| 00:00 | 75h | 12:00 | 7h |
| 01:00 | 20h | 13:00 | 24h |
| 02:00 | 3h | **14:00** | **155h** |
| 03:00 | 13h | 15:00 | 0h |
| 04:00 | 43h | **16:00** | **84h** |
| **05:00** | **86h** | 17:00 | 36h |
| 06:00 | 0h | 18:00 | 34h |
| 07:00 | 57h | 19:00 | 31h |
| 08:00 | 18h | 20:00 | 41h |
| 09:00 | 0h | 21:00 | 22h |
| 10:00 | 13h | 22:00 | 28h |
| 11:00 | 0h | 23:00 | 39h |

**Summary:** Peak building hours (most session activity): **14:00** (155h), **05:00** (86h), **16:00** (84h), **00:00** (75h), **07:00** (57h). So you have a strong afternoon block (2–4pm), a late-night/early-morning block (midnight–5am, 7am), and a late-afternoon block (4pm). 9am and 11am are minimal — likely when you're doing anchors (post, etc.) rather than deep build.

---

## 4) Deep Work Patterns (AI Analysis)

*Inferred from `brain/` artifact types and hidden conversation logs.*

- **Builder Ratio:** **82%** of all sessions result in file changes or artifacts (68 build sessions out of 83 total logs). You rarely "just chat" — you build.
- **Verification Discipline:** **93%** of Implementation Plans have a corresponding Walkthrough (54 plans, 50 walkthroughs). You almost always verify your work before moving on.
- **Work Scope:** You use Antigravity for **full-project** work, not just code.
  - **Product:** User Interviews, Viral Mechanics, Voice Feedback Design.
  - **Infra:** Deployment Guides, Vercel/Android Workflows.
  - **Management:** Weekly Updates, Task Lists.

---

## How to refresh these stats

Cursor can't read Antigravity's data directly (encrypted `.pb` files). To update the numbers above, either get output from Antigravity or run the scripts on your machine (they read `~/.gemini/antigravity/brain/`).

**Where Antigravity stores data:** Readable = `brain/<conversation-id>/` (artifacts + file mtimes). Not readable = `conversations/` and `implicit/` (encrypted).

### Option 1: Ask Antigravity (best)

Open a **new Antigravity chat** and ask for launch-sprint + all-time stats in markdown, then paste the reply into this doc (sections 1–2). Antigravity can use its own analytics.

### Option 2: Session totals (with optional date range)

```bash
# All-time
bash code/dashboard/scripts/antigravity-session-stats.sh

# Launch sprint only
bash code/dashboard/scripts/antigravity-session-stats.sh --since 2024-12-13 --until 2026-01-06
```

Paste the output into sections 1–2 above.

### Option 3: Day-of-week and hour-of-day breakdown

```bash
bash code/dashboard/scripts/antigravity-session-breakdown.sh
```

Paste the output into section 3 above.

Scripts live in `code/dashboard/scripts/`. Run from repo root.

