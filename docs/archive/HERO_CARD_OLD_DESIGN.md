# Previous Today hero card design (saved for reference)

This describes the hero card design we had before switching to the daily voice memo challenge look (ChallengeQueue style with bowl accents and brand colors). You can restore elements from this if needed.

## Layout
- **Block:** Fixed/min height (~58% or 68% of screen when recording), rounded corners (20), brand color or dark gradient background.
- **States:** intro (challenge dropped, not done) | recording (ChallengeQueueCard embedded) | done (from card) | classic done (already did today).

## Intro state (challenge dropped, has pending)
- **CHALLENGE DROPPED** pill (red/coral, small, top).
- **Prompt** (1–2 lines, hero size).
- **Who replied:** Horizontal row of overlapping avatars (42px) with optional play overlay; first replier had "1st" badge. Subtitle: "Maria, Jake and 2 others replied" or "be the first to reply".
- **First-time:** "new challenges just dropped", "record a voice reply", subtitle, **Start** button.
- **Returning:** Single **Record** CTA (mic icon + "record").
- **Status pill** (bottom-left): "done" | "skipped" | "not replied" with color.
- **Notifications** link (bottom) when permission not granted.

## Classic done state (no pending / already did today)
- "next challenge in" + countdown (red).
- "see you next time" or "yesterday: [prompt]".
- Optional "who replied" avatar row.
- **Do another** button (opens historical challenges).

## Completion state (just finished on card)
- "i drank my soup" title.
- Random subtitle and button (e.g. "go see who replied").
- Primary CTA navigated to group chat.

## Recording state
- "← back" to intro.
- Progress dots if multiple challenges.
- **ChallengeQueueCard** in a ScrollView (prompt, hints, vocab, record → review → send).

## Styles (key names in index.jsx)
- `heroLiveBlock`, `heroLiveContent`, `heroLiveContentTop`, `heroLiveDroppedPill`, `heroLivePrompt`, `heroLiveWhoSection`, `heroLiveWhoRow`, `heroLiveWhoAvatarWrap`, `heroLiveWhoAvatar`, `heroLivePlayOverlay`, `heroLiveFirstBadge`, `heroLiveBeFirst`, `heroStartBlock`, `heroStartContext`, `heroStartTitle`, `heroStartSubtitle`, `heroStartButton`, `heroRecordCta`, `heroLiveBottomRow`, `heroLiveCtaButton`, `heroLiveCtaBigArrow`, `heroLiveStatusCorner`, `heroLiveStatusPill`, `heroLiveNotifWrap`, `heroCompletionWrap`, `heroCompletionIcon`, `heroCompletionTitle`, `heroCompletionSubtitle`, `heroCompletionButton`, `heroBackRow`, `heroProgressRow`, `heroCardScroll`.

## Colors
- Brand: cream, green, pink, turquoise (`BRAND_BG_COLORS`).
- Classic done used green; intro/recording cycled by challenge index; completion used random from `getRandomCompletion().bgColor`.
