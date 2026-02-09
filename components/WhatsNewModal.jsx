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
        title: 'Daily Soup Challenge 🥣',
        description: 'A fresh, immersive way to share your daily soup. No backlog, just vibes.',
    },
    {
        image: require('../assets/whats-new/voice-feedback.png'),
        title: 'Get AI Corrections',
        description: 'Tap "Correct Me!" to get instant AI feedback on your pronunciation.',
    },
    {
        image: require('../assets/whats-new/ingredients.png'),
        title: 'Need More Ingredients?',
        description: 'Stuck? Look for instant inspiration and sample phrases.',
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
