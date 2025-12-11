import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    withSequence
} from 'react-native-reanimated';

export default function SoupBowlAnimation({ onPress }) {
    const rotation = useSharedValue(0);

    useEffect(() => {
        // A fast, simple "stirring" wiggle animation
        rotation.value = withRepeat(
            withSequence(
                withTiming(15, { duration: 150, easing: Easing.linear }),
                withTiming(-15, { duration: 300, easing: Easing.linear }),
                withTiming(0, { duration: 150, easing: Easing.linear }),
                withTiming(0, { duration: 600 }) // Pause to let the soup settle
            ),
            -1, // Infinite
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }]
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={animatedStyle}>
                <Image
                    source={require('../assets/ls-icon-bowl.png')}
                    style={styles.bowl}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: 100,
    },
    bowl: {
        width: 80,
        height: 80,
        resizeMode: 'contain',
    },
});
