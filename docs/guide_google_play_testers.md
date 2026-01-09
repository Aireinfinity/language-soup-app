# 🛒 Google Play Internal Testing Guide

You have **13 testers**. You want **Auto-Updates**.
This means you MUST use **Internal Testing**.

## The Hard Rule (Why Victor Failed)
**Google Play ONLY accepts Google Emails.**
- Gmail (`bob@gmail.com`) -> ✅ WORKS
- G-Suite (`bob@startup.com` hosted on Google) -> ✅ WORKS
- Hotmail/Outlook/Yahoo -> ❌ **FAILS IMMEDATELY**

### Solution for Victor (and others like him):
1. **Option A (Best for Auto-Updates):** Ask him: *"Hey, do you have a Gmail address? I need it for the Play Store."*
2. **Option B (If he refuses):** He MUST create a Google Account *using* his Hotmail address here: [accounts.google.com/signup](https://accounts.google.com/signup).

---

## 🚀 How to Manage Your 13 Testers Easily

You don't need to manually type emails every time.

### 1. Create an Email List (CSV)
1. Go to **Google Play Console** > **Users and Permissions**.
2. Click **Email Lists** > **Create email list**.
3. Name it `Soup Initial Testers`.
4. Upload a CSV with your 13 emails (or paste them).
5. **Save.**

### 2. Assign List to Release
1. Go to **Testing** > **Internal testing**.
2. Click **Testers** tab.
3. Check the box for `Soup Initial Testers`.
4. **Save changes.**

### 3. The "Auto-Update" Magic Link
1. Still in **Testers** tab, scroll down.
2. Verify "Copy link" under **How testers join your test**.
3. **Send this ONE link to your group chat.**
   - Anyone on your Email List can click it -> "Accept Invite" -> Download.
   - When you push a new build (`eas submit -p android`), they just open the Play Store and hit "Update".

## Summary
- **Victor:** Needs a Gmail (or Google-linked Hotmail). No way around it for Play Store.
- **Everyone Else:** Add to the Email List once.
- **Updates:** Automatic forever.
