# Android Build Submission Guide

## Option 1: EAS Submit (Automated)

### Prerequisites:
1. Go to [Google Play Console](https://play.google.com/console)
2. Select "Language Soup" app
3. Navigate to: **Setup → API access**
4. Click "Create new service account" or use existing
5. Download the JSON key file
6. Save it in: `/Users/Aireinfinity/Desktop/language-soup/code/app/`

### Submit Command:
```bash
cd /Users/Aireinfinity/Desktop/language-soup/code/app
eas submit --platform android --latest
```

---

## Option 2: Manual Upload (Faster for now)

### Steps:
1. Download your APK/AAB from EAS build dashboard
2. Go to [Google Play Console](https://play.google.com/console)
3. Select "Language Soup"
4. Navigate to: **Testing → Internal testing**
5. Click "Create new release"
6. Upload the APK/AAB file
7. Add release notes
8. Click "Review release" → "Start rollout"

### Get Shareable Link:
1. After rollout, go to **Testing → Internal testing**
2. Click "Testers" tab
3. Copy the **opt-in URL** (this is your TestFlight-like link!)
4. Share this link with testers

---

## Current Build Info:
- Platform: Android
- Build completed: ✅
- Ready to submit

**Recommendation:** Use Option 2 (manual) for now - it's faster and you'll get the link immediately!
