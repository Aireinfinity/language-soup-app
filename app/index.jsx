import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function BootScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Just a small delay to ensure fonts/layout are ready, then show everything
        setTimeout(() => setReady(true), 100);
    }, []);

    const handleButtonPress = () => {
        router.replace('/how-it-works');
    };

    if (!ready) return <View style={styles.container} />;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.textBlock}>
                {/* Title */}
                <ThemedText style={styles.headword}>language soup</ThemedText>

                {/* Pronunciation */}
                <ThemedText style={styles.phonetic}>/ˈlæŋɡwɪdʒ suːp/</ThemedText>

                {/* Verb */}
                <ThemedText style={styles.partOfSpeech}>verb</ThemedText>

                {/* Definition */}
                <View style={styles.definitionBlock}>
                    <ThemedText style={styles.definitionText}>
                        <ThemedText style={{ fontWeight: 'bold' }}>Definition: </ThemedText>
                        The act of diving headfirst into chaotic, messy language practice...
                        and somehow making something shareable and delicious out of it.
                    </ThemedText>
                </View>

                {/* Example */}
                <View style={{ marginTop: 24 }}>
                    <ThemedText style={styles.exampleText}>
                        <ThemedText style={styles.exampleLabel}>Example: </ThemedText>
                        "im language souping so hard right now my head hurts 😭"
                    </ThemedText>
                </View>
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={handleButtonPress}
                    style={styles.soupButton}
                >
                    <View style={styles.buttonContent}>
                        <ThemedText style={styles.buttonText}>mmm good soup</ThemedText>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    textBlock: {
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
        alignItems: 'flex-start',
        marginTop: 120,
        paddingHorizontal: 24,
        zIndex: 1,
    },
    headword: {
        fontSize: 36,
        fontWeight: 'normal',
        color: '#000000',
        fontFamily: 'System',
        marginBottom: 4,
        lineHeight: 42,
    },
    phonetic: {
        fontSize: 20,
        color: '#000000',
        fontFamily: 'System',
        marginBottom: 4,
    },
    partOfSpeech: {
        fontSize: 18,
        fontStyle: 'italic',
        fontWeight: '500',
        color: '#000000',
        marginBottom: 16,
    },
    definitionBlock: {
        marginBottom: 8,
    },
    definitionText: {
        fontSize: 18,
        lineHeight: 28,
        color: '#000000',
        textAlign: 'left',
    },
    exampleText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#000000',
        textAlign: 'left',
    },
    exampleLabel: {
        fontStyle: 'normal',
        fontWeight: 'bold',
        color: '#000000',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
    soupButton: {
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        backgroundColor: '#19b091', // Teal
    },
    buttonContent: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        backgroundColor: 'transparent',
        borderRadius: 30,
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: 1,
    },
});
