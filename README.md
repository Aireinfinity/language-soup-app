# Language Soup App (Expo) 🍜

This folder contains the **main Language Soup user app**, built with **Expo + React Native**.

## What lives here

- The mobile app that users install on **iOS** and **Android** (and optionally run on web).
- Screens, components, and logic for challenges, groups, and day-to-day usage.
- Expo/EAS configuration and scripts for starting the app and running builds.

## How it connects

- Talks directly to **Supabase** for users, groups, messages, and more.
- Works alongside:
  - The web admin dashboard in `code/app-dashboard`.
  - The marketing website in `code/website`.

## Deployment (high level)

- Local development and previews are run with **Expo**.
- Production builds for iOS/Android are created via **EAS** (Expo Application Services).

