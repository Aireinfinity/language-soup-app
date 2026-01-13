import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Modal, Pressable, ScrollView, ActivityIndicator, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { getAvatarSource } from '../utils/soupUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ReactionViewerModal - WhatsApp-style reaction viewer (Pop-out style)
 * Shows who reacted with their avatar and username, filtered by emoji tabs
 */
export function ReactionViewerModal({ visible, reactions, users, onClose }) {
    console.log('[ReactionViewerModal] Render:', { visible, reactionsCount: reactions?.length, usersCount: users?.length });
    const [activeTab, setActiveTab] = useState('All');

    const reactionsList = reactions || [];
    const usersList = users || [];
    const uniqueEmojis = [...new Set(reactionsList.map(r => r.emoji))];
    const tabs = ['All', ...uniqueEmojis];

    useEffect(() => {
        if (visible) {
            setActiveTab('All');
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
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.backdrop}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={styles.container}>
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
                                                            source={getAvatarSource(user.avatar_url)}
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
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: SCREEN_WIDTH * 0.85,
        maxHeight: '60%',
        minHeight: 300,
        backgroundColor: '#FDF5E6', // Cream
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
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
