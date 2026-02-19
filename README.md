# Language Soup — App + Admin 🍜

This folder contains **two things** in one repo:

1. **Expo app** (React Native): the mobile app users install. Lives in `app/`, `components/`, `contexts/`, etc. Run with `npm run start` (or `npm run start:dev` for dev client).
2. **Admin dashboard** (Vite): the web dashboard for support, growth, queue. Lives in `src/`. Run with `npm run dev`.

## What lives where

- **App:** `app/`, `components/`, `contexts/`, `constants/`, `hooks/`, `lib/`, `utils/` — screens, feed, chat, profile, onboarding.
- **Admin:** `src/` — SupportInbox, GrowthCharts, QueueTab, etc.
- **Shared:** Supabase config, some constants. Both talk to the same Supabase project.

## How it connects

- Talks directly to **Supabase** for users, groups, messages, and more.
- Marketing website (if present) lives in `code/website`.

## Deployment (high level)

- Local development and previews are run with **Expo**.
- Production builds for iOS/Android are created via **EAS** (Expo Application Services).

