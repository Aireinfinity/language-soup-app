import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Modal, Pressable, ScrollView, Animated, Dimensions, ActivityIndicator } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ReactionViewerModal - WhatsApp-style reaction viewer (Pop-out style)
 * Shows who reacted with their avatar and username, filtered by emoji tabs
 */
export function ReactionViewerModal({ visible, reactions, users, onClose }) {
    const [activeTab, setActiveTab] = useState('All');
    const [canClose, setCanClose] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const reactionsList = reactions || [];
    const usersList = users || [];
    const uniqueEmojis = [...new Set(reactionsList.map(r => r.emoji))];
    const tabs = ['All', ...uniqueEmojis];

    useEffect(() => {
        if (visible) {
            setActiveTab('All');
            setCanClose(false);

            // Animation
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                })
            ]).start();

            // Guard timer - wait 500ms before allowing close
            const timer = setTimeout(() => {
                setCanClose(true);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            scaleAnim.setValue(0.95);
            opacityAnim.setValue(0);
            setCanClose(false);
        }
    }, [visible]);

    if (!visible) return null;

    const hasUsers = usersList.length > 0;

    // Filter users based on active tab
    const filteredUsers = activeTab === 'All'
        ? usersList.map(user => ({
            ...user,
            emoji: reactionsList.find(r => r.user_id === user.id)?.emoji
        }))
        : usersList.filter(user =>
            reactionsList.some(r => r.user_id === user.id && r.emoji === activeTab)
        ).map(user => ({ ...user, emoji: activeTab }));

    const handleClose = () => {
        if (!canClose) return;

        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            })
        ]).start(() => onClose());
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.backdrop}>
                {/* Independent backdrop pressable to avoid bubbling issues */}
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={handleClose}
                />

                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.content}>
                        {/* Tab Bar */}
                        <View style={styles.tabWrapper}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.tabBar}
                                contentContainerStyle={styles.tabContent}
                            >
                                {tabs.map((tab) => (
                                    <Pressable
                                        key={tab}
                                        onPress={() => setActiveTab(tab)}
                                        style={[
                                            styles.tabItem,
                                            activeTab === tab && styles.activeTabItem
                                        ]}
                                    >
                                        <Text style={[
                                            styles.tabText,
                                            activeTab === tab && styles.activeTabText
                                        ]}>
                                            {tab === 'All' ? `All ${reactionsList.length}` : tab}
                                        </Text>
                                        {activeTab === tab && <View style={styles.activeIndicator} />}
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        {/* User List */}
                        <ScrollView style={styles.userList} bounces={true}>
                            {!hasUsers ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator color="#00adef" />
                                </View>
                            ) : (
                                filteredUsers.map((user) => (
                                    <View key={user.id} style={styles.userRow}>
                                        <View style={styles.avatarContainer}>
                                            {user.avatar_url ? (
                                                <Image
                                                    source={{ uri: user.avatar_url }}
                                                    style={styles.avatar}
                                                />
                                            ) : (
                                                <View style={styles.avatarPlaceholder}>
                                                    <Text style={styles.avatarText}>
                                                        {user.display_name?.charAt(0).toUpperCase() || '?'}
                                                    </Text>
                                                </View>
                                            )}
                                            {activeTab === 'All' && (
                                                <View style={styles.rowEmojiBadge}>
                                                    <Text style={styles.rowEmoji}>{user.emoji}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.username}>{user.display_name}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: SCREEN_WIDTH * 0.85,
        maxHeight: '60%',
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    content: {
        flex: 1,
    },
    tabWrapper: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
    },
    tabBar: {},
    tabContent: {
        paddingHorizontal: 8,
    },
    tabItem: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
    },
    activeTabItem: {},
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#00adef',
        fontWeight: '700',
    },
    activeIndicator: {
        position: 'absolute',
        bottom: 0,
        left: '20%',
        right: '20%',
        height: 2,
        backgroundColor: '#00adef',
        borderRadius: 1,
    },
    userList: {
        flexGrow: 0,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#00adef',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    rowEmojiBadge: {
        position: 'absolute',
        bottom: -2,
        right: -4,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 1,
        borderWidth: 1.5,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    rowEmoji: {
        fontSize: 12,
    },
    userInfo: {
        flex: 1,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#f0f0f0',
        paddingVertical: 4,
    },
    username: {
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
    },
});
