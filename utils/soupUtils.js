export const SOUP_ASSETS = {
    'cereal': require('../assets/images/avatars/cereal.png'),
    'tomato': require('../assets/images/avatars/tomato_soup.png'),
    'salad': require('../assets/images/avatars/salad.png'),
    'acai': require('../assets/images/avatars/acai.png'),
    'chicken': require('../assets/images/avatars/chicken_soup.png'),
    'water': require('../assets/images/avatars/water_soup.png'),
    'bathtub': require('../assets/images/avatars/bathtub_soup.png'),
};

const SOUP_IDS = Object.keys(SOUP_ASSETS);

// Stable default soup avatar per user id (for "who replied" when they have no photo)
export const getDefaultSoupAvatarForId = (userId) => {
    if (!userId) return 'soup://cereal';
    let h = 0;
    for (let i = 0; i < userId.length; i++) h = ((h << 5) - h) + userId.charCodeAt(i) | 0;
    const id = SOUP_IDS[Math.abs(h) % SOUP_IDS.length];
    return `soup://${id}`;
};

export const getAvatarSource = (avatarUrl) => {
    if (!avatarUrl) return null;

    // Check for "Meta-Soup" Protocol
    if (avatarUrl.startsWith('soup://')) {
        const soupId = avatarUrl.replace('soup://', '');
        return SOUP_ASSETS[soupId] || null;
    }

    // Legacy / Custom Uploads
    return { uri: avatarUrl };
};
