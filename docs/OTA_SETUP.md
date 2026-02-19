# OTA (EAS Update) – setup and publish

One-time setup is done. Don’t change this unless you add a new channel/branch.

---

## What’s configured

- **eas.json** – Production profile has `"channel": "production"`. New production builds will request updates from the production channel.
- **Channel → branch** – Channel `production` is linked to branch `production`. Run once (already done):
  ```bash
  eas channel:edit production --branch production
  ```
- **app.json** – `updates.url` set, `checkAutomatically: "ON_LOAD"`, `runtimeVersion: { "policy": "appVersion" }` (runtime version = app `version`, e.g. 1.0.4).

---

## How to publish an OTA (JS-only changes)

From `code/dashboard`:

```bash
eas update --branch production --message "Short description of the change"
```

- Users on the **current app version** (e.g. 1.0.4) get the update on next app launch.
- If you bump `version` in app.json (e.g. for a new store build), that new build has a new runtime version; publish again after that build is live so that version gets OTAs too.

---

## If updates don’t show up

1. **Runtime version** – OTA is tied to the app version at build time. Build 1.0.4 only receives updates published for runtime `1.0.4`. Check Expo dashboard → Updates to see which runtime version the published update targets.
2. **Channel → branch** – If you ever create a new channel or branch, link them: `eas channel:edit <channel> --branch <branch>`.
3. **Profile “check for updates”** – In the app, tap it to see Runtime and Channel; confirms what the build is using.

---

*Setup completed Feb 2026. Channel production ↔ branch production linked.*
