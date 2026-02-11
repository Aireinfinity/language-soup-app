# Running the app (dev build on your phone)

## Where is the terminal in Cursor?

- **Menu:** **View → Terminal** (or **Terminal → New Terminal**).
- **Shortcut:** **Ctrl+`** (backtick) on Windows/Linux, **Cmd+`** on Mac.
- The terminal opens at the **bottom** of the Cursor window. If you don’t see it, drag the bottom edge up or click the **Terminal** tab at the bottom.

The terminal is where you run commands. Your project folder in Cursor is the repo root; for app commands you need to be in the app folder (see below).

---

## Two ways to run (pick one)

Your EAS dev build expects the **scheme** `languagesoup`. All these commands pass `--scheme languagesoup` so the QR code and links open in your dev build instead of failing or opening the wrong app.

### Option A: Same Wi‑Fi, no QR (server “pops up” on phone)

1. **Terminal:** `cd code/dashboard` then:
   ```bash
   npm run start:dev
   ```
2. **Phone:** Open your **EAS dev build** → **Development servers**. **Language Soup** should appear. Tap it.

Requires: Mac and phone on the **same Wi‑Fi**, same Expo account. If you see “No dev servers found,” use Option B.

### Option B: Tunnel + QR (works from anywhere)

1. **Terminal:** `cd code/dashboard` then:
   ```bash
   npm run start:dev:tunnel
   ```
2. **Phone:** Scan the **QR code** in the terminal with your camera (or dev build’s scan). It will open in your Language Soup dev build.

Uses Expo’s tunnel so the phone can reach your Mac even on different networks. Slightly slower to connect than LAN, but one command that works.

---

## What each script does (simplified)

| Script | Command | When to use |
|--------|--------|-------------|
| `npm run start` | `expo start --scheme languagesoup` | Quick start; QR uses correct scheme. |
| `npm run start:dev` | `expo start --dev-client --lan --scheme languagesoup` | Same Wi‑Fi; dev build can list server, tap to open. |
| `npm run start:dev:tunnel` | `expo start --dev-client --tunnel --scheme languagesoup` | Any network; scan QR to open in dev build. |

The **scheme** (`languagesoup`) is what ties the QR code and “Open in dev build” link to your app. Without it, Expo shows a warning and the link may not open in your dev build.

---

## If you still see “No dev servers found” (Option A)

- **Same Wi‑Fi**, no VPN, phone not on cellular only.
- **Same Expo account:** `npx expo whoami` in `code/dashboard`; same account in the dev build on the phone.
- **Firewall:** Allow Node/Metro on the Mac if prompted.
- **Fallback:** Use `npm run start:dev:tunnel` and scan the QR code.
