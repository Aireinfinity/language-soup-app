// Phone number utility functions

/**
 * Format phone number for display
 * Example: "5551234567" -> "(555) 123-4567"
 */
export function formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Return as-is if not 10 digits
    return phoneNumber;
}

/**
 * Clean phone number for API submission
 * Example: "(555) 123-4567" -> "5551234567"
 */
export function cleanPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/\D/g, '');
}

/**
 * Validate US phone number
 * Returns true if valid 10-digit number
 */
export function validatePhoneNumber(phoneNumber) {
    const cleaned = cleanPhoneNumber(phoneNumber);
    return cleaned.length === 10 && /^\d{10}$/.test(cleaned);
}

/**
 * Combine country code and phone number
 * Example: "+1", "5551234567" -> "+15551234567"
 */
export function getFullPhoneNumber(countryCode, phoneNumber) {
    const cleaned = cleanPhoneNumber(phoneNumber);
    return `${countryCode}${cleaned}`;
}

/**
 * Parse phone number from full format
 * Example: "+15551234567" -> { countryCode: "+1", number: "5551234567" }
 */
export function parseFullPhoneNumber(fullNumber) {
    if (fullNumber.startsWith('+1')) {
        return {
            countryCode: '+1',
            number: fullNumber.slice(2)
        };
    }
    return {
        countryCode: '+1',
        number: fullNumber
    };
}
