import React from 'react';
import { Pressable, StyleSheet, Animated } from 'react-native';
import { LifeBuoy } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ff6b9d',
    yellow: '#ffd93d',
    green: '#6bcf7f',
};

export function FloatingSupportButton({ onPress }) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.container}
        >
            <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
                <LifeBuoy size={24} color="#fff" />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 1000,
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
