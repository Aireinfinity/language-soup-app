import React from 'react';
import { View, Pressable, StyleSheet, Animated, Text } from 'react-native';
import { MessageCircle } from 'lucide-react-native';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
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
            <Animated.View style={[styles.buttonContainer, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.button}>
                    <MessageCircle size={24} color="#fff" />
                </View>
                <Text style={styles.label}>get help</Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 16,
        zIndex: 1000,
    },
    buttonContainer: {
        alignItems: 'center',
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
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    label: {
        marginTop: 6,
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
        textAlign: 'center',
    },
});
