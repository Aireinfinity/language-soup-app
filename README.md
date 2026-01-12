# Language Soup Dashboard 🍜

The admin dashboard for the Language Soup app.

## Deployment Configuration 🚀

This project is deployed on **Vercel**.

### Important: Vercel Configuration (`vercel.json`)
The `vercel.json` file controls the build settings.

**CRITICAL RULE:**
Do **NOT** add an `ignoreCommand` that filters by directory (e.g., `git diff ... ./src`).
*   **Why?** Dependency updates (in `package.json` or `package-lock.json`) happen *outside* the `src` folder.
*   **Result:** If you filter by `./src`, dependency updates will be **ignored** by Vercel, leading to broken builds (e.g., React version mismatches).
*   **Current Setup:** We removed the `ignoreCommand` intentionally so that **EVERY** push triggers a build check. This is safer and ensures dependencies are always synced.

### Environment Variables
Required in Vercel Project Settings:
*   `VITE_SUPABASE_URL`: Your Supabase URL
*   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key

(Without these, the app will crash on load).
