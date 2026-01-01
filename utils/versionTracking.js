import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const VERSION_KEY = '@app_version';

// Get version from app.json (expo config)
const CURRENT_VERSION = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';

export async function shouldShowWhatsNew() {
    try {
        const lastSeenVersion = await AsyncStorage.getItem(VERSION_KEY);

        // If no version stored, or version is different, show What's New
        if (!lastSeenVersion || lastSeenVersion !== CURRENT_VERSION) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking version:', error);
        return false;
    }
}

export async function markWhatsNewAsSeen() {
    try {
        await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
    } catch (error) {
        console.error('Error saving version:', error);
    }
}

export async function resetWhatsNew() {
    // For testing only - clears the version so modal shows again
    try {
        await AsyncStorage.removeItem(VERSION_KEY);
        console.log('What\'s New reset - modal will show on next app load');
    } catch (error) {
        console.error('Error resetting version:', error);
    }
}

export function getCurrentVersion() {
    return CURRENT_VERSION;
}
