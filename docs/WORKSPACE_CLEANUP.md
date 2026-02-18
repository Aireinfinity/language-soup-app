# Workspace cleanup – do this without deleting anything important

**Rule:** Don’t delete until you’re sure. **Move to `docs/archive/` first.** You can delete from archive later if you never need it.

---

## ✅ Do not delete (core)

| File / folder | Why |
|---------------|-----|
| `CONTEXT.md` | Product, design, admin, dev – main reference. |
| `FEATURES_AND_REQUESTS.md` | Customer asks, backlog, “what should we work on?” |
| `docs/KEY_DOCUMENTS.md` | Index of where everything lives. |
| `docs/user_interviews.md` | All user feedback in one place. |
| `docs/FOUNDER_SCHEDULE.md` | Your schedule, Sundays, anchors. |
| `docs/SOCIAL_CONTENT_CALENDAR.md` | When to post, milestones, holidays. |
| `docs/MARKETING_ASSETS.md` | Where assets live + design ref. |
| `.cursor/rules/*.mdc` | Cursor rules – AI uses these. |
| `constants/CopyPhilosophy.js` | Copy lists, taglines, loading text – code uses it. |

---

## 📦 Likely safe to archive (old specs, duplicates, one-off audits)

**Archive = move to `docs/archive/`.** Then you can still search or open them; they’re just out of the main list.

| Doc | Reason |
|-----|--------|
| `HERO_CARD_OLD_DESIGN.md` | Old design; current hero is shipped. |
| `HOME_PAGE_PLAN.md` | Planning doc; product may have moved on. |
| `HOME_ORGANIZATION_OPTIONS.md` | Options doc; decision likely made. |
| `YOUR_DAY_HOME_SPEC.md` | Spec; may overlap with TODAY_TAB_*. |
| `YOUR_SOUP_PAGE_SPEC.md` | Spec (design options A–D now merged into this doc). |
| `TWO_TABS_DESIGN_HERO.md` | Design rationale; still useful reference but not daily. |
| `NEW_MEMBER_FLOW_TEST.md` | Test/audit; one-off. |
| `WELCOME_ONBOARDING_REDESIGN_PLAN.md` | Plan; onboarding is implemented. |
| `APP_SIMPLIFICATION_INVENTORY.md` | Inventory; one-off. |
| `COMMUNITY_TAB_DATA_AUDIT.md` | Data audit; one-off. |
| `UX_NOTES.md` | General UX notes; may be folded into other docs. |
| `QUEST_AUDIT.md` | Audit; one-off. |
| `antigravity_report.md` | Report; one-off. |

**Keep unless you’re sure:** `ONBOARDING_AUDIT_*`, `TODAY_TAB_DESIGN_CONCEPT`, `APP_VISUAL_DESIGN_BRIEF` – still referenced or active design.

---

## 🔧 Safe process

1. **Create archive folder:**  
   `mkdir -p code/dashboard/docs/archive`

2. **Move one at a time** (don’t bulk move until you’re comfortable):  
   `git mv code/dashboard/docs/HERO_CARD_OLD_DESIGN.md code/dashboard/docs/archive/`

3. **Use the app and build for a few days.** If you never open the archived file, it’s safe. You can delete from `archive/` later or leave it.

4. **Don’t delete** `docs/KEY_DOCUMENTS.md`, `CONTEXT.md`, `FEATURES_AND_REQUESTS.md`, or `.cursor/rules` – you’ll break references and AI behavior.

---

## 📋 After you archive

- Add a line to **KEY_DOCUMENTS.md** under “Other docs”:  
  `Archived (older specs/plans) → docs/archive/`
- So you know where old stuff went.
