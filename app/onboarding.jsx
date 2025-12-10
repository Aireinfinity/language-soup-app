import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Camera, ArrowRight } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

export default function OnboardingScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadAvatar(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (uri) => {
        try {
            setUploading(true);
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const filePath = `${user.id}/avatar-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64), {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
        } catch (error) {
            Alert.alert('Error', 'Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleContinue = async () => {
        if (!displayName.trim()) {
            Alert.alert('Required', 'Please enter a display name.');
            return;
        }

        setSaving(true);
        try {
            // Create user profile in app_users
            const { error } = await supabase
                .from('app_users')
                .upsert({
                    id: user.id,
                    display_name: displayName,
                    avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${user.id}`, // Default avatar
                    status_text: 'Ready for some soup! 🍲',
                    updated_at: new Date().toISOString(),
                });

            if (error) throw error;

            // Navigate to group selection
            router.replace('/group-selection');
        } catch (error) {
            console.error('Profile save error:', error);
            Alert.alert('Error', 'Could not save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome! 👋</Text>
                    <Text style={styles.subtitle}>Let's set up your profile.</Text>
                </View>

                <View style={styles.form}>
                    {/* Avatar Picker */}
                    <Pressable onPress={pickImage} style={styles.avatarContainer}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Camera size={40} color={Colors.textLight} />
                                <Text style={styles.avatarText}>Add Photo</Text>
                            </View>
                        )}
                        {uploading && (
                            <View style={styles.loaderOverlay}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        )}
                    </Pressable>

                    {/* Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="How should we call you?"
                            value={displayName}
                            onChangeText={setDisplayName}
                            maxLength={30}
                        />
                    </View>
                </View>

                <Pressable
                    style={[styles.button, !displayName.trim() && styles.buttonDisabled]}
                    onPress={handleContinue}
                    disabled={!displayName.trim() || saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>Start Slurping</Text>
                            <ArrowRight size={20} color="#fff" />
                        </>
                    )}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    header: {
        marginTop: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: Colors.textLight,
    },
    form: {
        flex: 1,
        marginTop: 60,
        alignItems: 'center',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E5E5',
        borderStyle: 'dashed',
    },
    avatarText: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 4,
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputGroup: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        color: Colors.text,
    },
    button: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
