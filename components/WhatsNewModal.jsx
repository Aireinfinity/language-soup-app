import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Image,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const FEATURES = [
    {
        image: require('../assets/whats-new/challenge-share.png'),
        title: 'Challenge a Friend',
        description: 'Share daily challenges and invite friends to Language Soup',
    },
    {
        image: require('../assets/whats-new/reactions.png'),
        title: 'Message Reactions',
        description: 'React to messages and see who else reacted',
    },
    {
        image: require('../assets/whats-new/quests.png'),
        title: 'Quest System',
        description: 'Complete quests to explore the app and earn rewards',
    },
    {
        image: require('../assets/whats-new/native-chat.png'),
        title: 'Chat with Natives',
        description: 'Connect with native speakers in your groups',
    },
    {
        image: require('../assets/whats-new/native-chat-2.png'),
        title: 'Language Exchange',
        description: 'Practice with real people through language exchange',
    },
    {
        image: require('../assets/whats-new/playlists.png'),
        title: 'Group Playlists',
        description: 'Create shared Spotify playlists with your French group',
    },
    {
        image: require('../assets/whats-new/group-avatars.png'),
        title: 'Flag-Based Avatars',
        description: 'Groups now show beautiful flag-based avatars',
    },
    {
        image: require('../assets/whats-new/emoji-password.png'),
        title: 'Emoji Passwords',
        description: 'Secure your account with a fun emoji password (screenshot it!)',
    },
    {
        image: require('../assets/whats-new/features-notifications.png'),
        title: 'Smart Notifications',
        description: 'Get notified when your friends complete a challenge!',
    },
];

export default function WhatsNewModal({ visible, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleNext = () => {
        if (currentIndex < FEATURES.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onClose();
        }
    };

    const handleSkip = () => {
        onClose();
    };

    const currentFeature = FEATURES[currentIndex];

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={styles.backdrop}>
                <View style={styles.container}>
                    <View style={styles.modal}>
                        {/* Header */}
                        <Text style={styles.header}>What's New</Text>

                        {/* Feature Card */}
                        <View style={styles.featureCard}>
                            <Image
                                source={currentFeature.image}
                                style={styles.featureImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.title}>{currentFeature.title}</Text>
                            <Text style={styles.description}>{currentFeature.description}</Text>
                        </View>

                        {/* Pagination Dots */}
                        <View style={styles.pagination}>
                            {FEATURES.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        index === currentIndex && styles.activeDot,
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                                <Text style={styles.skipText}>Skip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                                <Text style={styles.nextText}>
                                    {currentIndex === FEATURES.length - 1 ? 'Done' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 32,
        width: width - 40,
        maxWidth: 400,
        alignItems: 'center',
    },
    header: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 32,
    },
    featureCard: {
        alignItems: 'center',
        paddingVertical: 20,
        minHeight: 280,
        justifyContent: 'center',
    },
    featureImage: {
        width: width - 120,
        height: 200,
        borderRadius: 12,
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 24,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DDD',
    },
    activeDot: {
        backgroundColor: '#FF6B35',
        width: 24,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 16,
    },
    skipButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 16,
        color: '#999',
        fontWeight: '500',
    },
    nextButton: {
        flex: 1,
        backgroundColor: '#FF6B35',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
});
