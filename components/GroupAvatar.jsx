import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// One friendly color per language (no flags) — cute, distinct, works for Your Soup redesign
const LANGUAGE_COLORS = {
    'french': '#7BA3C9',
    'spanish': '#E8A87C',
    'italian': '#85CDCA',
    'german': '#5D5D5D',
    'portuguese': '#C38D9E',
    'japanese': '#E8B4B8',
    'korean': '#A8D8B9',
    'chinese': '#F4A582',
    'mandarin': '#F4A582',
    'arabic': '#41B3A3',
    'russian': '#9B59B6',
    'hindi': '#F39C12',
    'turkish': '#E74C3C',
    'dutch': '#3498DB',
    'polish': '#ECF0F1',
    'swedish': '#1ABC9C',
    'norwegian': '#9B59B6',
    'danish': '#E67E22',
    'finnish': '#3498DB',
    'greek': '#2ECC71',
    'hebrew': '#3498DB',
    'thai': '#E91E63',
    'vietnamese': '#00BCD4',
    'indonesian': '#E53935',
    'malay': '#43A047',
    'tagalog': '#1E88E5',
    'hungarian': '#8E44AD',
    'czech': '#26A69A',
    'romanian': '#FF7043',
    'ukrainian': '#FFB74D',
    'bengali': '#66BB6A',
    'urdu': '#42A5F5',
    'persian': '#26A69A',
    'farsi': '#26A69A',
    'swahili': '#7CB342',
    'yoruba': '#00897B',
    'afrikaans': '#5C6BC0',
};

// Brand fallback + hash for unknown languages so they get a stable color
const PALETTE = ['#00ADEF', '#19b091', '#EC008B', '#FDF5E6', '#7BA3C9', '#E8A87C', '#9B59B6', '#41B3A3'];
const getColorForLanguage = (language) => {
    const key = language?.toLowerCase();
    if (LANGUAGE_COLORS[key]) return LANGUAGE_COLORS[key];
    if (!key) return PALETTE[0];
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i);
    return PALETTE[Math.abs(hash) % PALETTE.length];
};

/**
 * GroupAvatar — language-colored circle + soup bowl (no flags). Cute, ready for Your Soup redesign.
 */
export default function GroupAvatar({ language, size = 60 }) {
    const backgroundColor = getColorForLanguage(language);

    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
            <View style={[styles.colorCircle, { backgroundColor }]} />
            <View style={[styles.whiteCircle, {
                width: size * 0.55,
                height: size * 0.55,
                borderRadius: size * 0.275
            }]}>
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
        backgroundColor: '#f0f0f0',
    },
    colorCircle: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    whiteCircle: {
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    soupBowl: {},
});
