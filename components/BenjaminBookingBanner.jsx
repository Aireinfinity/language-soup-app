/**
 * Banner for "Book 1:1 with Benjamin" on the main (Language Soup) feed.
 * Collapsible via AsyncStorage (tap to expand/collapse; always bring back). Tap opens booking URL. Uses Benjamin's profile photo.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { getAvatarSource } from '../utils/soupUtils';

const COLLAPSED_KEY = 'benjamin_booking_banner_collapsed';
const LEGACY_DISMISS_KEY = 'benjamin_booking_banner_dismissed';
// Flow: Stripe first (pay), then Stripe redirects to Calendly. Set EXPO_PUBLIC_BENJAMIN_BOOKING_URL to your Stripe payment link; in Stripe set "redirect after payment" to your Calendly link.
const BOOKING_URL = process.env.EXPO_PUBLIC_BENJAMIN_BOOKING_URL || '';

const SOUP_COLORS = {
    turquoise: '#00ADEF',
    pink: '#EC008B',
    cream: '#FDF5E6',
    text: '#2d3436',
    dark: '#1a1a2e',
};

export function BenjaminBookingBanner() {
    const [collapsed, setCollapsed] = useState(false);
    const [benjamin, setBenjamin] = useState(null);

    useEffect(() => {
        (async () => {
            const collapsedVal = await AsyncStorage.getItem(COLLAPSED_KEY);
            const legacyDismissed = await AsyncStorage.getItem(LEGACY_DISMISS_KEY);
            if (legacyDismissed === '1' && collapsedVal === null) {
                await AsyncStorage.setItem(COLLAPSED_KEY, '1');
                await AsyncStorage.removeItem(LEGACY_DISMISS_KEY);
                setCollapsed(true);
            } else {
                setCollapsed(collapsedVal === '1');
            }
        })();
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('app_users')
                .select('id, display_name, avatar_url')
                .ilike('display_name', 'Benjamin')
                .limit(1)
                .maybeSingle();
            if (!cancelled && data) setBenjamin(data);
        })();
        return () => { cancelled = true; };
    }, []);

    const handleCollapse = useCallback((e) => {
        e?.stopPropagation?.();
        setCollapsed(true);
        AsyncStorage.setItem(COLLAPSED_KEY, '1');
    }, []);

    const handleExpand = useCallback((e) => {
        e?.stopPropagation?.();
        setCollapsed(false);
        AsyncStorage.setItem(COLLAPSED_KEY, '0');
    }, []);

    const handlePress = useCallback(() => {
        if (collapsed) {
            handleExpand();
            return;
        }
        if (BOOKING_URL) Linking.openURL(BOOKING_URL).catch(() => {});
    }, [collapsed]);

    const avatarSource = benjamin?.avatar_url ? getAvatarSource(benjamin.avatar_url) : null;

    // Collapsed: slim bar, tap to expand
    if (collapsed) {
        return (
            <Pressable
                style={({ pressed }) => [styles.wrap, styles.wrapCollapsed, pressed && styles.wrapPressed]}
                onPress={handleExpand}
                accessibilityLabel="Expand Benjamin booking banner"
            >
                <Text style={styles.collapsedTitle} numberOfLines={1}>
                    Book 1:1 with Benjamin
                </Text>
                <ChevronDown size={20} color={SOUP_COLORS.turquoise} strokeWidth={2.5} />
            </Pressable>
        );
    }

    // Expanded: full banner, tap to open booking; chevron to collapse
    return (
        <View style={styles.wrap}>
            <Pressable style={({ pressed }) => [styles.contentWrap, pressed && styles.wrapPressed]} onPress={() => { if (BOOKING_URL) Linking.openURL(BOOKING_URL).catch(() => {}); }} accessibilityLabel="Book 1:1 with Benjamin">
                <View style={styles.content}>
                    <View style={styles.avatarWrap}>
                        {avatarSource ? (
                            <Image source={avatarSource} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarLetter}>B</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.copy}>
                        <Text style={styles.title} numberOfLines={1}>
                            Book 1:1 with Benjamin
                        </Text>
                        <Text style={styles.sub} numberOfLines={1}>
                            30 min French, 30 min English · $5
                        </Text>
                    </View>
                </View>
            </Pressable>
            <Pressable
                style={({ pressed }) => [styles.collapseBtn, pressed && styles.closeBtnPressed]}
                onPress={handleCollapse}
                hitSlop={16}
                accessibilityLabel="Collapse banner"
            >
                <ChevronUp size={20} color={SOUP_COLORS.text} strokeWidth={2.5} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        marginHorizontal: 12,
        marginBottom: 8,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: SOUP_COLORS.turquoise,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 8,
        shadowColor: SOUP_COLORS.turquoise,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    wrapCollapsed: {
        paddingVertical: 10,
        justifyContent: 'space-between',
    },
    wrapPressed: {
        opacity: 0.92,
    },
    contentWrap: {
        flex: 1,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrap: {
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.cream,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.pink,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarLetter: {
        fontSize: 20,
        fontWeight: '800',
        color: '#fff',
    },
    copy: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.dark,
        letterSpacing: 0.2,
    },
    sub: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.turquoise,
        marginTop: 2,
    },
    collapsedTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: SOUP_COLORS.dark,
        flex: 1,
        marginRight: 8,
    },
    collapseBtn: {
        padding: 10,
        margin: -4,
    },
    closeBtnPressed: {
        opacity: 0.6,
    },
});
