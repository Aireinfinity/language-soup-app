import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utilities for consistent UX across the app
 */

export const haptics = {
    // Light tap - for button presses, selections
    light: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    // Medium tap - for long press, important actions
    medium: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    // Heavy tap - for critical actions
    heavy: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    // Success - for successful actions (message sent, group joined)
    success: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    // Warning - for errors, failed actions
    warning: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },

    // Error - for critical errors
    error: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },

    // Selection change - for pickers, toggles
    selection: () => {
        Haptics.selectionAsync();
    }
};
