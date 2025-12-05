import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';

export function Button({
    onPress,
    title,
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    style
}) {
    const backgroundColor = disabled
        ? '#ccc'
        : variant === 'primary'
            ? Colors.primary
            : variant === 'accent'
                ? Colors.accent
                : Colors.white;

    const textColor = variant === 'outline' ? Colors.primary : Colors.white;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.button,
                { backgroundColor },
                variant === 'outline' && styles.outline,
                size === 'small' && styles.small,
                size === 'large' && styles.large,
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={textColor} />
            ) : (
                <Text style={[styles.text, { color: textColor }, size === 'small' && styles.textSmall]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 9999, // Full radius
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.primary,
    },
    small: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    large: {
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    textSmall: {
        fontSize: 14,
    },
});
