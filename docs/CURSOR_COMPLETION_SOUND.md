# Cursor IDE: completion sound when agent finishes

The "completion sound when the agent finishes responding" is a **Cursor IDE setting**, not something in the Language Soup repo.

## Where to fix it

1. **Cursor Settings UI**  
   Open **Settings** (Cursor menu or `Cmd+,`) and look under **Cursor** or **Features / Agent** for an option like "Completion sound" or "Agent completion sound". Turn it on and ensure volume is up.

2. **User settings.json**  
   Path on macOS: `~/Library/Application Support/Cursor/User/settings.json`  
   Look for keys such as `cursor.*` or `aipopup.*` that mention sound or completion. If Cursor documents a specific key (e.g. `cursor.agent.completionSound`), add or enable it there.

3. **If it’s on but you hear nothing**  
   Check system volume, Cursor’s own volume (if it has one), and that the correct output device is selected. Some sounds only play when the Cursor window is focused.

No code changes in this repo are required; it’s purely Cursor configuration.
