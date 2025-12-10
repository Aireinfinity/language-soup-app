import crashlytics from '@react-native-firebase/crashlytics';
import Constants from 'expo-constants';

/**
 * Initialize Crashlytics
 * Call this early in your app's lifecycle
 */
export const initializeCrashlytics = async () => {
    // Skip in Expo Go - Firebase only works in production builds
    if (Constants.appOwnership === 'expo') {
        console.log('⚠️ Crashlytics skipped - not available in Expo Go');
        return;
    }

    try {
        // Enable crash collection
        await crashlytics().setCrashlyticsCollectionEnabled(true);

        console.log('✅ Crashlytics initialized');
    } catch (error) {
        console.error('Failed to initialize Crashlytics:', error);
    }
};

/**
 * Log a non-fatal error to Crashlytics
 * @param {Error} error - The error to log
 * @param {string} context - Additional context about where the error occurred
 */
export const logError = (error, context = '') => {
    if (__DEV__) {
        console.error(`[${context}]`, error);
    }

    // Skip in Expo Go
    if (Constants.appOwnership === 'expo') return;

    try {
        if (context) {
            crashlytics().log(`Error in ${context}`);
        }
        crashlytics().recordError(error);
    } catch (e) {
        console.error('Failed to log error to Crashlytics:', e);
    }
};

/**
 * Set user identifier for crash reports
 * @param {string} userId - User's unique identifier
 */
export const setUserId = (userId) => {
    // Skip in Expo Go
    if (Constants.appOwnership === 'expo') return;

    try {
        crashlytics().setUserId(userId);
    } catch (error) {
        console.error('Failed to set user ID in Crashlytics:', error);
    }
};

/**
 * Set custom attributes for crash reports
 * @param {Object} attributes - Key-value pairs of custom attributes
 */
export const setCustomAttributes = (attributes) => {
    // Skip in Expo Go
    if (Constants.appOwnership === 'expo') return;

    try {
        Object.entries(attributes).forEach(([key, value]) => {
            crashlytics().setAttribute(key, String(value));
        });
    } catch (error) {
        console.error('Failed to set custom attributes in Crashlytics:', error);
    }
};

/**
 * Log a custom message to Crashlytics
 * @param {string} message - The message to log
 */
export const logMessage = (message) => {
    // Skip in Expo Go
    if (Constants.appOwnership === 'expo') return;

    try {
        crashlytics().log(message);
    } catch (error) {
        console.error('Failed to log message to Crashlytics:', error);
    }
};

/**
 * Force a test crash (for testing only!)
 * Remove this from production code
 */
export const testCrash = () => {
    if (__DEV__) {
        console.warn('⚠️ Test crash triggered - this should only be used in development!');
    }

    // Skip in Expo Go
    if (Constants.appOwnership === 'expo') {
        console.warn('⚠️ Test crash skipped - not available in Expo Go');
        return;
    }

    crashlytics().crash();
};
