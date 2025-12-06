import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
};

export default function AddNativeSpeakerScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [bio, setBio] = useState('');
    const [availability, setAvailability] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!bio.trim() || !availability.trim() || !whatsappNumber.trim()) {
            Alert.alert('Missing Info', 'Please fill in all fields');
            return;
        }

        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('app_native_speakers')
                .insert({
                    user_id: user.id,
                    display_name: user.user_metadata?.display_name || 'Anonymous',
                    languages: ['French'],
                    bio: bio.trim(),
                    availability: availability.trim(),
                    whatsapp_number: whatsappNumber.trim(),
                    photo_url: user.user_metadata?.avatar_url || null,
                    is_active: true,
                });

            if (error) throw error;

            Alert.alert('Success!', 'You\'ve been added as a native speaker', [
                {
                    text: 'OK',
                    onPress: () => router.back(),
                },
            ]);
        } catch (error) {
            console.error('Error adding native speaker:', error);
            Alert.alert('Error', 'Failed to add you as a speaker. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photos');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            // TODO: Upload to Supabase storage
            setPhotoUrl(result.assets[0].uri);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={SOUP_COLORS.text} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Add Yourself</Text>
                    <Text style={styles.subtitle}>Share your language skills 🎯</Text>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <Text style={styles.label}>Bio</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Tell people about yourself..."
                    placeholderTextColor="#999"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                />

                <Text style={styles.label}>When are you free?</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Weekends, evenings after 6pm"
                    placeholderTextColor="#999"
                    value={availability}
                    onChangeText={setAvailability}
                />

                <Text style={styles.label}>WhatsApp Number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="+1234567890"
                    placeholderTextColor="#999"
                    value={whatsappNumber}
                    onChangeText={setWhatsappNumber}
                    keyboardType="phone-pad"
                />

                <Pressable
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    <Text style={styles.submitButtonText}>
                        {submitting ? 'Adding...' : 'Add Me as a Native Speaker'}
                    </Text>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        gap: 12,
        backgroundColor: '#fff',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    photoButton: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: SOUP_COLORS.pink,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    photoButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
    },
    submitButton: {
        backgroundColor: SOUP_COLORS.green,
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
