# Power users and testing tiers

Who to ask when testing new features, in order. Save this so we don't forget.

---

## Testing order (who to ask first)

1. **Noah** (you) – test yourself first.
2. **Power users** – ~15–20 people below; trusted, engaged, give good feedback.
3. **App testers** – the "app testers" group (~111 people); broader beta.
4. **Everyone else** – general rollout.

---

## Power users (curated list)

People to prioritize for early feature tests and feedback. Add to a separate group if you want (e.g. "power users" or "soup kitchen insiders").

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
- Babka
- Diana (mom)
- Ava
- CJ
- Ruby
- Aurelia
- Nicki
- Josiah
- Oshack
- Adora

*(If you create a "power users" group in the app, add these by display name; you can match to IDs via Supabase or the dashboard.)*

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
