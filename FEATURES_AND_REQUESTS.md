# Features & requests

Stuff customers ask for that you want to build or think about. Update status as you go: New → In progress → Done.

---

## This build (focus)

**Bar for this build:**  
• **New users:** Can they come in and send voice memos easily?  
• **Existing users:** Can they come in and send voice memos easily?  
• **Vibe:** Does it feel social?

**Concrete:**  
• Confirm everything works with the **current flow** and the **new onboarding flow** (end-to-end).  
• **Notification strategy (social proof, no spam):**  
  - **Reply = voice only.** When someone sends a voice memo, others get "Someone replied to the challenge" (max 1 per user per 2 min; atomic dedup). Text replies don't trigger push.  
  - **Challenge drop:** If you're in 14 groups you can get 14 notifications (one per trigger fire). **Fix when back:** Challenge-drop path should send **max one per user per day** (or per batch), e.g. table `challenge_drop_notification_sent` with (user_id, sent_at) and only send to users we haven't sent to in last 24h.  
  - **Goal:** Re-engage people who have notifications on, with social proof ("someone replied"), without clumping or spam.  
  - **Testing:** Notifications run in Edge Functions (production). To test without spamming: staging Supabase project or test-user allowlist in the function.

---

## Next build / remind later

• **Support center redesign** — not for this build. Remind Noah to schedule this for a later build.

• **Revamp support chat: 24/7, always talking to customers, better support chat.**  
  Who: Noah

---

IN PROGRESS

• **Onboarding flow + getting users to send their first voice memo**  
  First-challenge is now inline on Today (ChallengeQueueCard, no welcome modal). Next: double-check full onboarding flow end-to-end and confirm new users reliably get to first voice.  
  **Quick test (new / 0-voice account):** Open Daily tab → you should see a **big 5→4→3→2→1 countdown** on the card, then "your first challenge just dropped" → tap to open challenge. Card should **fit one screen (no scroll)**.  
  Who: Noah

• Initial onboarding "record one word"  
  Who: Team

• Onboarding pipeline audit: how they find us → first voice memo  
  Who: Noah

---

## 👋 When you ask "what should we work on?"

**→ Double-check the onboarding flow and getting users to send their first voice memo.**  
Audit the path from signup → first challenge (inline on Today) → first send. Test with a fresh account; fix any gaps so new users reliably hit "send" once.

---

NEW

• **Really clean up the user database** — full pass on app_users / auth hygiene, test accounts, orphans, duplicates. Now or later; note for Noah so he doesn't forget.  
  Who: Noah

• **Emoji password / login** — Never delete or clear app_users.emoji_password; users need it to log in. Migration `20260215_preserve_emoji_password.sql` makes claim_user_identity preserve existing emoji_password on conflict. If an account already lost theirs, Noah may need to set it manually in DB or use password reset flow.  
  Who: Noah

• **Profile pics load faster** — "add ur profile pic" and other avatar grids: reduce payload (e.g. thumbnail URLs if Supabase Pro / image transform), or add caching (e.g. react-native-fast-image). For now, example-avatars on avatar screen limited to 24.  
  Who: Noah

• **Greek vs Ancient Greek** — We have Ancient Greek in the list; add a modern Greek (Ελληνικά) group if missing, or merge with Ancient Greek? Noah to decide.  
  Who: Noah

• Voice rooms — live speaking, HelloTalk alternative with no time limit  
  Who: Allison

• Block feature for DMs  
  Who: Ashton

• Unlock new soups / progression the more you speak  
  Who: Ashton (2/14)

• Push notification: include topic/hint + social proof (e.g. "X soupers responded")  
  Who: Miranda (2/13)

• Challenge-drop notification: max one per user per day (not one per group — avoid 14 notifications when in 14 groups)  
  Who: Noah

• Reward native speakers / incentive so they show up and correct (e.g. native chat reward, corner for corrections)  
  Who: Babka, Jon L, Karen

• Complete beginner can participate — product must work for true beginners (e.g. Aidan, 8h into German)  
  Who: Aidan

• **Community tab: little pop-up where people can vote on the next features Noah builds (hierarchy/priority).** Copy vibe: "hi i'm noah i'm building this app alone — vote on what u want to prioritize and we'll go with what the community wants!"  
  Who: Noah

• Guard onboarding swipe so one accidental swipe doesn't kick them out  
  Who: Mattheos

• In-app emoji password explainer + set expectation "practice in a way you're not used to"; optional help/landing so onboarding can stay short  
  Who: Jon

• Shorten sign-up / less up front (keep emoji password)  
  Who: Alpha

• Help with vocabulary when responding to challenges (forgetting words, "don't know the vocab to respond")  
  Who: Sarah

• Show who's on it / that others use it (social proof for activation)  
  Who: Saba

• Transcripts for voice memos / challenge replies (so users can read what was said)  
  Who: Noah

• Language creator economy videos — get creators paid, help learners  
  Who: Noah

• After the challenge (countdown): surface podcast mode — e.g. "great, you did it — want to hear how others did it today?" Keep podcast mode always accessible (no unlock gate); also a place to listen if they just want to listen that day  
  Who: Noah

• **Friend group chats / small groups** — group chats with friends (private or small groups) and/or make friends through the app; appeal of listening to friends' voice notes vs big language groups. Build later.  
  Who: Aurelia (ex power WhatsApp user, 2/19)

---

DONE

• Today tab redesign — one hero action, clear path to record daily challenge — DONE!!!!  
  Who: Noah / team

• Listen back to voice memos before sending — Aurelia, Johnny  
• Voice memo shows "00 seconds" / duration — Ruby  
• App crashes when clicking profile photos — Hamza, Miranda  
• Android: white bars on bottom nav — Monica  
• Android: input field hidden when typing — Réka  
• iOS: input bar too high above keyboard — Noah  
• Persistent "all done" banner on refresh — Hamza  
• Group chat not loading when tapping — Julian  
• Profile photo upload on Android — Sam  
• Messages marked unread when you send — Ruby  
• Emoji reactions sometimes don't work — Sydney  
• "Need more ingredients" for beginners — Team  
• DMs entry point ("Message" on native speakers → chat) — Team  
• Voice memo AI feedback — Team  
• Challenge friends on app — Team  
• Completion screen: celebratory copy + rotating CTA — Team  
• Voice memo playback volume (challenge flow): speaker + full volume — Team  
• Beginner phrase: one short sentence in hints — Team  
• Advanced vocab TTS: word = target language — Team  
• Unread from self: update last_read_at on send — Team  
• Group chat tap: guards, error screen if groupId missing — Team  
• Admin "Challenge" / "Test" buttons — Team

---

## Today's one big thing (this build)

• **Existing users:** Come in, send voice memos easily. One clear path (see challenge → record → send).  
• **New users:** Come in, send voice memos easily. Confirm current flow + new onboarding flow end-to-end.  
• **Feel:** Social. Then (this build or next): notification hierarchy + "when people respond" notifications so users can opt in to what they want.

Order of work: customer issues first, then confirm flows, then polish. **Later build:** Support center redesign.

---

## How to use

• New report or idea → add under NEW.  
• Starting work → move that bullet to IN PROGRESS.  
• Shipped → move to DONE.  
• You text users casually; no template. Keep status accurate.

---

## Git (for AI)

• App repo path: code/dashboard  
• Push from Cursor: Source Control → commit → Push  
• Terminal: gh auth login once if needed; then git push works
