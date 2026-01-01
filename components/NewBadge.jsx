import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * NewBadge - A small badge to indicate new features
 * 
 * Usage:
 * <View style={{ flexDirection: 'row', alignItems: 'center' }}>
 *   <Text>Feature Name</Text>
 *   <NewBadge />
 * </View>
 */
export default function NewBadge({ style }) {
    return (
        <View style={[styles.badge, style]}>
            <Text style={styles.text}>NEW</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        backgroundColor: '#FF6B35',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    text: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
