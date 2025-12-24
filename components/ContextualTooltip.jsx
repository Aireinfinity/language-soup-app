import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

const TOOLTIP_PREFIX = 'tooltip_seen_';

export default function ContextualTooltip({
    message,
    targetPosition,
    arrowDirection = 'down',
    tooltipId,
    visible = true,
}) {
    const [show, setShow] = useState(false);
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        checkIfSeen();
    }, [tooltipId]);

    useEffect(() => {
        if (show) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => {
                handleDismiss();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [show]);

    const checkIfSeen = async () => {
        try {
            const seen = await AsyncStorage.getItem(`${TOOLTIP_PREFIX}${tooltipId}`);
            if (!seen && visible) {
                setShow(true);
            }
        } catch (error) {
            console.error('Error checking tooltip status:', error);
        }
    };

    const handleDismiss = async () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setShow(false);
        });

        try {
            await AsyncStorage.setItem(`${TOOLTIP_PREFIX}${tooltipId}`, 'true');
        } catch (error) {
            console.error('Error saving tooltip status:', error);
        }
    };

    if (!show) return null;

    const getArrowStyle = () => {
        const baseStyle = {
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: 8,
            borderRightWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
        };

        switch (arrowDirection) {
            case 'up':
                return {
                    ...baseStyle,
                    borderBottomWidth: 8,
                    borderBottomColor: Colors.primary,
                    top: -8,
                    left: '50%',
                    marginLeft: -8,
                };
            case 'down':
                return {
                    ...baseStyle,
                    borderTopWidth: 8,
                    borderTopColor: Colors.primary,
                    bottom: -8,
                    left: '50%',
                    marginLeft: -8,
                };
            case 'left':
                return {
                    position: 'absolute',
                    width: 0,
                    height: 0,
                    borderTopWidth: 8,
                    borderBottomWidth: 8,
                    borderTopColor: 'transparent',
                    borderBottomColor: 'transparent',
                    borderRightWidth: 8,
                    borderRightColor: Colors.primary,
                    left: -8,
                    top: '50%',
                    marginTop: -8,
                };
            case 'right':
                return {
                    position: 'absolute',
                    width: 0,
                    height: 0,
                    borderTopWidth: 8,
                    borderBottomWidth: 8,
                    borderTopColor: 'transparent',
                    borderBottomColor: 'transparent',
                    borderLeftWidth: 8,
                    borderLeftColor: Colors.primary,
                    right: -8,
                    top: '50%',
                    marginTop: -8,
                };
            default:
                return baseStyle;
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                targetPosition,
                { opacity: fadeAnim },
            ]}
        >
            <Pressable onPress={handleDismiss} style={styles.tooltip}>
                <Text style={styles.message}>{message}</Text>
                <View style={getArrowStyle()} />
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 1000,
    },
    tooltip: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        maxWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    message: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
});
