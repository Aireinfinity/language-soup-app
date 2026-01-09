# 🤖 Easy Android Workflow

Here is how to solve your two Android headaches forever.

## 1. How to give Victor app access (Without Emails!)
Forget Google Play internal track. It's annoying for quick tests. Use the **Direct APK** method.

1. **Run this command:**
   ```bash
   eas build -p android --profile apk
   ```
2. **Wait ~15 mins.** Expo will give you a valid download link.
3. **Send that link to Victor** (WhatsApp/Text).
4. He taps it -> downloads `.apk` -> taps "Install".
   *(He might need to tap "Allow from unknown sources" once. That's it.)*

**Why this works:** It creates a standalone file. No Google Account validation required.

---

## 2. How to develop on your Google Pixel
You cannot use the generic "Expo Go" app from the store because your code has custom native stuff. You need to build your *own* Dev Client.

**Step 1: Build the Client (Do this ONCE)**
1. Run this command:
   ```bash
   eas build -p android --profile development
   ```
2. Download the resulting APK and install it on your **Pixel**.
   *(It will look like the requested app, but it's actually a "Developer Dashboard" for your app).*

**Step 2: Code Daily**
1. Plug in your Pixel (or be on same WiFi).
2. Run your server:
   ```bash
   npx expo start --dev-client
   ```
3. Open the **Language Soup** app you installed in Step 1.
4. It should detect the server and connect. (Or verify your IP address matches).

✅ **Done.** Now you have a TestFlight-like experience (APK link) and a working Pixel dev environment.
