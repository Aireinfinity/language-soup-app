import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 300;

/**
 * Swipe left (finger moves left) = forward → onSwipeForward.
 * Swipe right (finger moves right) = back → onSwipeBack.
 * Only activates when horizontal movement dominates so vertical ScrollViews still work.
 */
export function OnboardingSwipeForward({ children, onSwipeForward, onSwipeBack, style }) {
    const pan = React.useMemo(() => {
        const fireForward = () => onSwipeForward?.();
        const fireBack = () => onSwipeBack?.();
        return Gesture.Pan()
            .activeOffsetX([-25, 25])
            .failOffsetY([-30, 30])
            .onEnd((e) => {
                'worklet';
                const x = e.translationX;
                const vx = e.velocityX;
                const swipedRight = x > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD;
                const swipedLeft = x < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;
                if (swipedLeft && onSwipeForward) runOnJS(fireForward)();
                else if (swipedRight && onSwipeBack) runOnJS(fireBack)();
            });
    }, [onSwipeForward, onSwipeBack]);

    return (
        <GestureDetector gesture={pan}>
            <View style={[{ flex: 1 }, style]}>{children}</View>
        </GestureDetector>
    );
}
