# Android: Launch, Workflow & Testers

One doc for Play Store launch, dev workflow (APK + Pixel), and tester setup. Merge of `android_launch_roadmap.md`, `android_workflow.md`, and `guide_google_play_testers.md`.

---

## 1. Road to production (the "20 tester" rule)

You're in **Internal Testing**. To launch on the real Play Store you must satisfy Google's rule for new accounts.

**Rule: 20 testers / 14 days**
- **20 testers** opted in to your **Closed Testing** track (Internal doesn't count). You had 13; need +7.
- Active for **14 consecutive days** after you hit 20.

**Strategy: move to Closed Testing now**
1. **Play Console** → **Testing** → **Closed testing** → **Create track** (e.g. name it "Alpha").
2. In the new track, add the same **email list** you used for Internal. Tell existing testers to use the *new* link (it switches them to Closed).
3. Recruit 7 more (friends, family, WhatsApp). They only need to opt in; they don't have to use the app daily.
4. Once you have 20 in Closed, a **14-day timer** starts. After 14 days, **"Apply for Production"** appears → answer questions → live on Play Store.

**Summary:** Internal = for you/Victor debugging. Closed = where to move everyone to start the timer. Open/Production = only after Closed is satisfied.

---

## 2. Workflow: APK for Victor & Pixel dev

**Give Victor (or anyone) app access without Play Store emails**
- Run: `eas build -p android --profile apk`
- Wait ~15 min; get download link → send link (WhatsApp/text). They tap → download `.apk` → Install (may need "Allow from unknown sources" once). No Google account required.

**Develop on a Google Pixel (or other device with custom native code)**
- **Expo Go from the store won't work** — you need a **dev client**.
- **Once:** `eas build -p android --profile development` → download APK, install on Pixel (it looks like your app but is a dev shell).
- **Daily:** Plug Pixel (or same WiFi) → `npx expo start --dev-client` → open the installed Language Soup app → it connects to the server. Same idea as TestFlight on iOS.

---

## 3. Testers: Internal testing & email list

**Gmail rule:** Play Store only accepts **Google accounts** (Gmail or G-Suite). Hotmail/Outlook/Yahoo → **fails**. For Victor: (A) use a Gmail, or (B) create a Google account using his email at [accounts.google.com/signup](https://accounts.google.com/signup).

**Manage testers with an email list**
1. **Play Console** → **Users and permissions** → **Email lists** → **Create** (e.g. "Soup Initial Testers"). Upload CSV or paste emails.
2. **Testing** → **Internal testing** → **Testers** tab → check the box for that list → Save.
3. Under **How testers join**, copy the **one link** → send to your group. They click → Accept → Download. New builds (`eas submit -p android`) → they update from the Play Store.

**Summary:** One list, one link, auto-updates. Victor needs a Google-linked email for Play; for quick tests without Play, use the APK link from section 2.
