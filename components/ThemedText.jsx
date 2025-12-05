import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

export function ThemedText({ style, type = 'default', color, ...rest }) {
    return (
        <Text
            style={[
                styles.default,
                type === 'title' ? styles.title : undefined,
                type === 'subtitle' ? styles.subtitle : undefined,
                type === 'caption' ? styles.caption : undefined,
                type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
                color ? { color } : undefined,
                style,
            ]}
            {...rest}
        />
    );
}

const styles = StyleSheet.create({
    default: {
        fontSize: 16,
        lineHeight: 24,
        color: Colors.text,
        fontFamily: 'System', // Use System font for now, can be replaced with Inter later
    },
    defaultSemiBold: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '600',
        color: Colors.text,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 32,
        color: Colors.text,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    caption: {
        fontSize: 12,
        lineHeight: 16,
        color: Colors.textLight,
    },
});
