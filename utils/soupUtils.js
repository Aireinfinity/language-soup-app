export const SOUP_ASSETS = {
    'cereal': require('../assets/images/avatars/cereal.png'),
    'tomato': require('../assets/images/avatars/tomato_soup.png'),
    'salad': require('../assets/images/avatars/salad.png'),
    'acai': require('../assets/images/avatars/acai.png'),
    'chicken': require('../assets/images/avatars/chicken_soup.png'),
    'water': require('../assets/images/avatars/water_soup.png'),
    'bathtub': require('../assets/images/avatars/bathtub_soup.png'),
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
