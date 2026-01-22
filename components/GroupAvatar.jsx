import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Map languages to flag emojis
const LANGUAGE_FLAGS = {
    'french': '🇫🇷',
    'spanish': '🇪🇸',
    'italian': '🇮🇹',
    'german': '🇩🇪',
    'portuguese': '🇵🇹',
    'japanese': '🇯🇵',
    'korean': '🇰🇷',
    'chinese': '🇨🇳',
    'arabic': '🇸🇦',
    'russian': '🇷🇺',
    'hindi': '🇮🇳',
    'turkish': '🇹🇷',
    'dutch': '🇳🇱',
    'polish': '🇵🇱',
    'swedish': '🇸🇪',
    'norwegian': '🇳🇴',
    'danish': '🇩🇰',
    'finnish': '🇫🇮',
    'greek': '🇬🇷',
    'hebrew': '🇮🇱',
    'thai': '🇹🇭',
    'vietnamese': '🇻🇳',
    'indonesian': '🇮🇩',
    'malay': '🇲🇾',
    'tagalog': '🇵🇭',
    'hungarian': '🇭🇺',
    'czech': '🇨🇿',
    'romanian': '🇷🇴',
    'ukrainian': '🇺🇦',
    'bengali': '🇧🇩',
    'urdu': '🇵🇰',
    'persian': '🇮🇷',
    'swahili': '🇰🇪',
    'afrikaans': '🇿🇦',
};

// Map languages to flag stripe patterns (solid colors, no gradients)
const FLAG_PATTERNS = {
    'french': { type: 'vertical', colors: ['#002395', '#FFFFFF', '#ED2939'] },
    'spanish': { type: 'horizontal', colors: ['#AA151B', '#F1BF00', '#AA151B'] },
    'italian': { type: 'vertical', colors: ['#009246', '#FFFFFF', '#CE2B37'] },
    'german': { type: 'horizontal', colors: ['#000000', '#DD0000', '#FFCE00'] },
    'portuguese': { type: 'vertical', colors: ['#006600', '#FF0000'] },
    'dutch': { type: 'horizontal', colors: ['#21468B', '#FFFFFF', '#AE1C28'] },
    'swedish': { type: 'horizontal', colors: ['#006AA7', '#FECC00'] },
    'hungarian': { type: 'horizontal', colors: ['#CD2A3E', '#FFFFFF', '#436F4D'] },
    'polish': { type: 'horizontal', colors: ['#FFFFFF', '#DC143C'] },
    'russian': { type: 'horizontal', colors: ['#FFFFFF', '#0039A6', '#D52B1E'] },
    'japanese': { type: 'solid', colors: ['#FFFFFF'] }, // White with red circle
    'chinese': { type: 'solid', colors: ['#DE2910'] }, // Red (China)
    'mandarin': { type: 'solid', colors: ['#DE2910'] }, // Red (China) - alias
    'korean': { type: 'solid', colors: ['#FFFFFF'] }, // White
    'finnish': { type: 'horizontal', colors: ['#FFFFFF', '#003580'] },
    'norwegian': { type: 'horizontal', colors: ['#BA0C2F', '#FFFFFF', '#00205B'] },
    'danish': { type: 'horizontal', colors: ['#C60C30', '#FFFFFF'] },
    'greek': { type: 'horizontal', colors: ['#0D5EAF', '#FFFFFF'] },
    'turkish': { type: 'solid', colors: ['#E30A17'] }, // Red
    'arabic': { type: 'horizontal', colors: ['#006C35', '#FFFFFF', '#000000'] }, // Saudi Arabia
    'hindi': { type: 'horizontal', colors: ['#FF9933', '#FFFFFF', '#138808'] }, // India
    'thai': { type: 'horizontal', colors: ['#ED1C24', '#FFFFFF', '#241D4F'] },
    'vietnamese': { type: 'solid', colors: ['#DA251D'] }, // Red (Vietnam)
    'indonesian': { type: 'horizontal', colors: ['#FF0000', '#FFFFFF'] },
    'tagalog': { type: 'horizontal', colors: ['#0038A8', '#CE1126', '#FFFFFF'] }, // Philippines
    'yoruba': { type: 'vertical', colors: ['#008751', '#FFFFFF', '#008751'] }, // Nigeria
    'swahili': { type: 'horizontal', colors: ['#000000', '#BB0000', '#00A74A'] }, // Kenya
    'czech': { type: 'horizontal', colors: ['#FFFFFF', '#D7141A', '#11457E'] },
    'romanian': { type: 'vertical', colors: ['#002B7F', '#FCD116', '#CE1126'] },
    'ukrainian': { type: 'horizontal', colors: ['#0057B7', '#FFD700'] },
    'bengali': { type: 'solid', colors: ['#006A4E'] }, // Bangladesh green
    'urdu': { type: 'vertical', colors: ['#FFFFFF', '#01411C'] }, // Pakistan
    'persian': { type: 'horizontal', colors: ['#239F40', '#FFFFFF', '#DA0000'] }, // Iran
    'farsi': { type: 'horizontal', colors: ['#239F40', '#FFFFFF', '#DA0000'] }, // Iran - alias
    'hebrew': { type: 'horizontal', colors: ['#FFFFFF', '#0038B8'] }, // Israel
    'malay': { type: 'horizontal', colors: ['#CC0001', '#FFFFFF'] }, // Malaysia
    'afrikaans': { type: 'horizontal', colors: ['#007A4D', '#FFFFFF', '#FFB81C'] }, // South Africa
    'default': { type: 'solid', colors: ['#00adef'] }, // Soup blue
};

/**
 * GroupAvatar - Design 5: Flag background with white soup bowl overlay
 * @param {string} language - The group's language
 * @param {number} size - Avatar size (default 60)
 */
export default function GroupAvatar({ language, size = 60 }) {
    const flag = LANGUAGE_FLAGS[language?.toLowerCase()] || '🌍';
    const pattern = FLAG_PATTERNS[language?.toLowerCase()] || FLAG_PATTERNS['default'];



    const renderFlagBackground = () => {
        if (pattern.type === 'solid') {
            return <View style={[styles.flagBackground, { backgroundColor: pattern.colors[0] }]} />;
        }

        if (pattern.type === 'horizontal') {
            return (
                <View style={styles.flagBackground}>
                    {pattern.colors.map((color, index) => (
                        <View
                            key={index}
                            style={{
                                flex: 1,
                                backgroundColor: color,
                                width: '100%'
                            }}
                        />
                    ))}
                </View>
            );
        }

        if (pattern.type === 'vertical') {
            return (
                <View style={[styles.flagBackground, { flexDirection: 'row' }]}>
                    {pattern.colors.map((color, index) => (
                        <View
                            key={index}
                            style={{
                                flex: 1,
                                backgroundColor: color,
                                height: '100%'
                            }}
                        />
                    ))}
                </View>
            );
        }
        // Fallback for unknown types or if pattern is somehow invalid
        return <View style={[styles.flagBackground, { backgroundColor: FLAG_PATTERNS['default'].colors[0] }]} />;
    };

    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
            {/* Flag-colored background - fills entire circle */}
            {renderFlagBackground()}

            {/* White circle background for soup bowl */}
            <View style={[styles.whiteCircle, {
                width: size * 0.55,
                height: size * 0.55,
                borderRadius: size * 0.275
            }]}>
                {/* Soup bowl in original colors on white background */}
                <Image
                    source={require('../assets/images/logo.png')}
                    style={[styles.soupBowl, {
                        width: size * 0.45,
                        height: size * 0.45,
                    }]}
                    resizeMode="contain"
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0', // Fallback background
    },
    flagBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    flagEmoji: {
        textAlign: 'center',
        lineHeight: undefined, // Let it size naturally
    },
    whiteCircle: {
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    soupBowlContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        // Removed white background - let flag show through!
    },
    soupBowl: {
        // Remove tintColor - keep original colors but on white background
    },
});
