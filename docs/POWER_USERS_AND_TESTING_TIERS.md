# Power users and testing tiers

Who to ask when testing new features, in order. Save this so we don't forget.

---

## Testing order (who to ask first)

1. **Noah** (you) – test yourself first.
2. **Power users** – ~15–20 people below; trusted, engaged, give good feedback.
3. **App testers** – the "app testers" group (~111 people); broader beta.
4. **Everyone else** – general rollout.

---

## Power users (curated list, ~20)

People to prioritize for early feature tests and feedback. They are auto-added to the in-app group **"Power users"** (not app testers).

- Noah
- Miranda
- Karen *(note: when we have Android / TestFlight isn’t on Android yet)*
- Johnny
- Eva
- Bridget
- Eryn
- Christian
- Scarlett
- Abby
- Felipe
- Babka / BabkaZs
- Diana (mom)
- Ava
- CJ
- Ruby
- Aurelia
- Nicki
- Josiah
- Oshack
- Adora
- Aidan
- hamza

---

## Power users group (in-app, auto-added)

The script adds everyone above to a group named **"Power users"**. They do **not** have to click to join; once you run the script, the group appears in their app live.

1. Open **Supabase → SQL Editor**.
2. Run **`code/dashboard/scripts/add_power_user_chat.sql`** (paste its contents).
3. The script creates **"Power users"** (hidden from browse), inserts each person into `app_group_members` by `display_name`. Only users who exist in `app_users` are added; duplicates are skipped.
4. You and each power user see **Power users** in Your groups and can use it as a group chat.

To add or remove people later: edit the script’s `display_name IN (...)` and re-run the insert part, or use Supabase Table Editor on `app_group_members`.

---

## Very first users (for future notes)

The earliest people on the app – worth remembering for milestones, thank-yous, or stories.

- Eva
- Oshack
- CJ
- Diana
- Kevin

---

## App testers

The **app testers** group has ~111 people. Use it for broader beta after power users. (Group is excluded from scheduled challenge sends so they don’t get daily challenges; see NOTES_FOR_LATER.md re app testers.)

---

## Getting IDs / exporting

To turn display names into user IDs or export for TestFlight/WhatsApp, use the SQL in **POWER_USERS_QUERY.md** (top users by message count). You can also search by `display_name` in Supabase `app_users` to match this list to IDs when needed.
