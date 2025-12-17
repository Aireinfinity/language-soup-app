import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, Pressable, ScrollView, Alert, Platform, KeyboardAvoidingView } from 'react-native';
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
    const [isEditMode, setIsEditMode] = useState(false);
    const [existingProfile, setExistingProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load existing profile on mount
    useEffect(() => {
        loadExistingProfile();
    }, []); // Empty dependency array - only run once on mount

    const loadExistingProfile = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('app_native_speakers')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Error loading profile:', error);
                setLoading(false);
                return;
            }

            if (data) {
                // Found existing profile - enter edit mode
                setIsEditMode(true);
                setExistingProfile(data);
                setBio(data.bio || '');
                setAvailability(data.availability || '');
                setWhatsappNumber(data.whatsapp_number || '');
            }
        } catch (error) {
            console.error('Error checking for existing profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!bio.trim() || !availability.trim() || !whatsappNumber.trim()) {
            Alert.alert('Missing Info', 'Please fill in all fields');
            return;
        }

        setSubmitting(true);

        try {
            if (isEditMode) {
                // Update existing profile
                const { error } = await supabase
                    .from('app_native_speakers')
                    .update({
                        bio: bio.trim(),
                        availability: availability.trim(),
                        whatsapp_number: whatsappNumber.trim(),
                    })
                    .eq('user_id', user.id);

                if (error) throw error;

                Alert.alert('Success!', 'Your profile has been updated', [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                    },
                ]);
            } else {
                // Insert new profile
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
            }
        } catch (error) {
            console.error('Error saving native speaker profile:', error);
            Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'add'} your profile. Please try again.`);
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

    if (loading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.center}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={SOUP_COLORS.text} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {isEditMode ? 'Edit Your Profile' : 'Add Yourself'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isEditMode ? 'Update your details 📝' : 'Share your language skills 🎯'}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
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
                            {submitting
                                ? (isEditMode ? 'Updating...' : 'Adding...')
                                : (isEditMode ? 'Update My Profile' : 'Add Me as a Native Speaker')
                            }
                        </Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: SOUP_COLORS.text,
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
