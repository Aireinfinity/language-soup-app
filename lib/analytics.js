/**
 * Product analytics: fire-and-forget event tracking to app_events.
 * Use for: screen views, button clicks, voice sent, phrases modal, etc.
 * Query in Supabase SQL or the admin dashboard "Events" view.
 */
import { supabase } from './supabase';

export const AnalyticsEvents = {
    // Screens
    SCREEN_VIEW: 'screen_view',
    // Feed / home
    FEED_VIEW: 'feed_view',
    CHALLENGE_TAP: 'challenge_tap',
    GROUP_CHAT_OPEN: 'group_chat_open',
    // Chat
    CHAT_VIEW: 'chat_view',
    VOICE_SENT: 'voice_sent',
    TEXT_SENT: 'text_sent',
    PHRASES_MODAL_OPEN: 'phrases_modal_open',
    PHRASES_MODAL_RECORD_SENT: 'phrases_modal_record_sent',
    VOICE_PLAY: 'voice_play',
    // Onboarding
    ONBOARDING_STEP: 'onboarding_step',
    ONBOARDING_COMPLETE: 'onboarding_complete',
    // Auth
    LOGIN_SUCCESS: 'login_success',
    // Notifications (already in app_notification_clicks; optional duplicate here)
    NOTIFICATION_CLICK: 'notification_click',
};

/**
 * Track an event. Fire-and-forget; never blocks or throws.
 * @param {string} eventName - e.g. 'voice_sent', 'screen_view'
 * @param {Object} [properties] - optional { group_id, group_name, language, ... }
 */
export async function trackEvent(eventName, properties = {}) {
    try {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        const { group_id, ...rest } = properties;
        await supabase.from('app_events').insert({
            user_id: user?.id ?? null,
            event_name: eventName,
            group_id: group_id ?? null,
            properties: rest && Object.keys(rest).length ? rest : {},
        });
    } catch (_) {
        // Silently ignore (e.g. no network, RLS, or table missing)
    }
}

/**
 * Call from UI without awaiting. Use for button clicks and navigation.
 */
export function track(eventName, properties = {}) {
    trackEvent(eventName, properties).catch(() => {});
}
