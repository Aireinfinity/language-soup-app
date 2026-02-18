# Deployment log (dashboard + edge)

Short log of what went live when, so we can roll back or compare. Add one line when you deploy.

Format: `Date | What | One-line behavior`

---

- **2026-02-17** | Dashboard: promoted **Feb 11** build to production (Vercel) | Rollback to pre–translation-break. Id: `dpl_4HcyCFr17LtiueyjJcCvTERUA6om`. Confirm: add-to-queue auto-translates, backfill, approve.
- **2026-02-17** | Edge: **send-scheduled-challenges** (code change, not yet deployed) | Reverted to translate-at-send (DeepL → Google). Deploy with `supabase functions deploy send-scheduled-challenges` when ready.

---

*When you deploy dashboard (Vercel) or an edge function (Supabase), add a line above with date, what you deployed, and the main behavior (e.g. “cron uses saved translations” vs “cron translates at send”).*
