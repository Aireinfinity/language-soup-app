# Language Soup — marketing assets (one place)

All PNG/JPG/icons and photos used for marketing, social, and brand are copied here so everything lives in one folder. **Originals are unchanged** — the app still uses `../` for icons, avatars, etc. This folder is for your reference and for creating new graphics.

## Structure

| Folder | Contents |
|--------|----------|
| **icons** | App icon, adaptive icon, favicon, splash, notification icon, ls-icon-bowl, icon_512 |
| **logos** | ls-logo-text, logo.png, design logos (LS, LLJ, LinkedIn banners) |
| **avatars** | All 7 soup avatars (chicken, tomato, bathtub, water, cereal, acai, salad) |
| **concepts** | Feature graphics, store graphics, banner concepts |
| **branding** | Logo variations, challenge previews, sketchy icons (from src/assets/branding + design) |
| **whats-new** | In-app “what’s new” screens (quests, voice feedback, ingredients, etc.) |
| **screenshots** | App screenshots (ready for store/social) |
| **design/branding** | From `design/branding/`: specimens, POS assets |
| **design/media-assets** | From `design/Media : Assets/`: LS/LLJ logos, LinkedIn banners, headshot, cream logo |
| **design/media-assets/ads** | Product pics, journal covers, Stripe/hungarian page |
| **design/wrapped** | Language_Soup_Wrapped_Full.png |
| **design/indesign-icons** | InDesign Icons (espresso, croissant, tea, africa, etc.) |
| **design/indesign-figures** | InDesign Digest fig_image_* assets |
| **website** | Hero, journal covers, website logos (from code/website/images) |
| **social** | Save Instagram/social graphics here when you create them |

## Where the app still points

- **app.json** → `./assets/icon.png`, `./assets/splash-icon.png`, `./assets/adaptive-icon.png`, etc. (unchanged)
- **Components** → `../assets/images/avatars/`, `../assets/ls-icon-bowl.png`, `../assets/whats-new/`, etc. (unchanged)

So this `marketing/` folder is a **copy** for convenience; don’t move or delete the originals in `assets/` or the build will break.

## Updated

Consolidated 2026-02-14 from:  
`code/dashboard/assets/`, `code/dashboard/assets/marketing_concepts/`,  
`code/dashboard/src/assets/`, `design/`, `code/website/images/`.
