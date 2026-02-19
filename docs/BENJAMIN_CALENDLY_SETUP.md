# Benjamin 1:1 — Calendly setup (free plan)

Calendly’s **free plan doesn’t allow team invitations**, so you can’t “invite Benjamin” and have his calendar drive your event. Two options:

---

## Option A: Benjamin creates his own Calendly (recommended)

**He owns the event type and his calendar is always in sync. You just get the link and give him the Stripe + confirmation text.**

1. **You send Benjamin:**
   - “Create a free Calendly at [calendly.com](https://calendly.com): one event type, 1 hour, name it **1:1 with Benjamin — 30 min French, 30 min English**, add Zoom as the location, connect your calendar. Then in the event’s **Confirmation email** add this line: **Secure your spot: pay $5 here** and paste this link: [your Stripe link]. Send me your booking link when it’s live.”
   - (You paste your actual Stripe link in the message.)

2. **Benjamin:** Creates the event, sets his availability (calendar or weekly hours), pastes your Stripe sentence into the confirmation email, sends you the booking link.

3. **You:** Use that link in the app banner. Done.

---

## Option B: You create the event, Benjamin tells you his availability

**No team invite. You create the event type; you set “available hours” to whatever Benjamin says (e.g. “Tuesdays 6–8pm Paris”).**

1. **You** at [calendly.com](https://calendly.com):
   - **Create** → **Event type**.
   - **Name:** `1:1 with Benjamin — 30 min French, 30 min English`
   - **Duration:** 1 hour.
   - **Location:** Zoom (or a recurring Zoom link).
   - **Availability:** Set **weekly hours** to what Benjamin tells you (e.g. “Tue 6pm–8pm Paris”, or a few windows). When his availability changes, he tells you and you edit.
   - **Emails** → Confirmation: add “Secure your spot: pay $5 here” + your Stripe link.
   - Copy the booking link.

2. **Benjamin:** Just tells you when he’s free (e.g. “Tuesdays 6–8pm Paris time”). No Calendly account needed.

3. **You:** Put the booking link in the app.

**Downside:** Any time Benjamin’s availability changes, he has to tell you and you update the event type.

---

## Summary

- **Option A:** Benjamin does the Calendly setup once, you send him Stripe + confirmation text. Best if his schedule changes.
- **Option B:** You do everything; he only sends you his weekly hours. Fine for a test with one fixed window per week.

**Plug the Calendly link** into Stripe’s Payment Link “redirect after payment” URL. **Plug the Stripe Payment Link** into the app (`EXPO_PUBLIC_BENJAMIN_BOOKING_URL`) and into `book-benjamin.html`.
