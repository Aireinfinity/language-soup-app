import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, Image, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Camera, ArrowLeft } from 'lucide-react-native';
import { ThemedText } from '../components/ThemedText';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { decode } from 'base64-arraybuffer';

export default function ProfileCreationScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [avatarUri, setAvatarUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [nameError, setNameError] = useState('');

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant photo library access to upload an avatar');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setAvatarUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const validateName = (text) => {
        setName(text);
        if (text.trim().length === 0) {
            setNameError('Name is required');
        } else if (text.trim().length > 50) {
            setNameError('Name must be less than 50 characters');
        } else {
            setNameError('');
        }
    };

    const handleSubmit = async () => {
        if (name.trim().length === 0) {
            setNameError('Name is required');
            return;
        }

        if (nameError) return;

        setUploading(true);

        try {
            let avatarUrl = null;

            // Upload avatar if selected (optional - skip if storage fails)
            if (avatarUri) {
                try {
                    const base64 = await FileSystem.readAsStringAsync(avatarUri, {
                        encoding: 'base64',
                    });

                    const filePath = `${user.id}/avatar.jpg`;

                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, decode(base64), {
                            contentType: 'image/jpeg',
                            upsert: true,
                        });

                    if (uploadError) {
                        console.warn('Avatar upload failed, continuing without avatar:', uploadError);
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(filePath);

                        avatarUrl = publicUrl;
                    }
                } catch (avatarError) {
                    console.warn('Avatar upload error, continuing without avatar:', avatarError);
                }
            }

            // Create/update user profile
            const { error: userError } = await supabase
                .from('app_users')
                .upsert({
                    id: user.id,
                    display_name: name.trim(),
                    avatar_url: avatarUrl,
                    status_text: 'Hey there! I am using Language Soup',
                });

            if (userError) throw userError;

            // Navigate to group selection
            router.replace('/group-selection');
        } catch (error) {
            console.error('Profile creation error:', error);
            Alert.alert('Error', 'Failed to create profile. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <ArrowLeft size={24} color={Colors.text} />
                        </Pressable>
                        <ThemedText style={styles.headerTitle}>Create Profile</ThemedText>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <ThemedText style={styles.title}>set up ur profile 🧑‍🍳</ThemedText>
                        <ThemedText style={styles.subtitle}>let's get u cooking!</ThemedText>

                        {/* Avatar Picker */}
                        <Pressable onPress={pickImage} style={styles.avatarContainer}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Camera size={40} color={Colors.primary} />
                                </View>
                            )}
                            <View style={styles.cameraIcon}>
                                <Camera size={20} color="#fff" />
                            </View>
                        </Pressable>
                        <ThemedText style={styles.avatarHint}>Tap to add a photo</ThemedText>

                        {/* Name Input */}

                        <View style={styles.inputContainer}>
                            <ThemedText style={styles.label}>what should we call u?</ThemedText>
                            <TextInput
                                style={[styles.input, nameError && styles.inputError]}
                                placeholder="Enter your name"
                                placeholderTextColor={Colors.textLight}
                                value={name}
                                onChangeText={validateName}
                                maxLength={50}
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                            {nameError ? (
                                <ThemedText style={styles.errorText}>{nameError}</ThemedText>
                            ) : null}
                        </View>

                        {/* Continue Button */}
                        <Pressable
                            onPress={handleSubmit}
                            style={[styles.button, (uploading || nameError || !name.trim()) && styles.buttonDisabled]}
                            disabled={uploading || !!nameError || !name.trim()}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <ThemedText style={styles.buttonText}>let's go!</ThemedText>
                            )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // cream
    },
    scrollContent: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 40,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarHint: {
        fontSize: 14,
        color: Colors.textLight,
        marginBottom: 32,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 32,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        width: '100%',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    inputError: {
        borderColor: '#ff3b30',
    },
    errorText: {
        color: '#ff3b30',
        fontSize: 14,
        marginTop: 4,
    },
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonDisabled: {
        backgroundColor: '#ccc',
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
