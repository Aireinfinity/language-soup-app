import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function AvatarScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [avatarUri, setAvatarUri] = useState(null);
    const [uploading, setUploading] = useState(false);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant photo library access');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                uploadAvatar(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const uploadAvatar = async (uri) => {
        setUploading(true);
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            const filePath = `${user.id}/avatar.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64), {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUri(publicUrl);

            // Save to profile
            await supabase
                .from('app_users')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);
        } catch (error) {
            console.error('Avatar upload error:', error);
            Alert.alert('Error', 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleContinue = () => {
        router.push('/onboarding/conversational');
    };

    const getRandomSoupAvatar = () => {
        const soups = [
            'cereal',
            'tomato-soup',
            'butternut-squash',
            'bowl-of-water',
            'tea',
            'smoothie-bowl',
            'pasta-too-much-sauce',
            'pesto-too-much-oil',
            'pancake-orange-juice',
            'salad-too-much-dressing',
            'coffee-with-milk',
            'melted-ice-cream',
            'vanilla-pudding',
            'guacamole'
        ];

        const randomSoup = soups[Math.floor(Math.random() * soups.length)];
        return `https://api.dicebear.com/7.x/big-smile/png?seed=${randomSoup}`;
    };

    const handleSkip = async () => {
        try {
            // Set a fun random soup avatar
            const randomAvatar = getRandomSoupAvatar();
            await supabase
                .from('app_users')
                .update({ avatar_url: randomAvatar })
                .eq('id', user.id);
        } catch (error) {
            console.error('Error setting default avatar:', error);
        }

        router.push('/onboarding/conversational');
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.content}>
                <Text style={styles.title}>add your profile pic 📸</Text>
                <Text style={styles.subtitle}>let people see your beautiful face</Text>

                <Pressable onPress={pickImage} style={styles.avatarContainer}>
                    {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Camera size={48} color={Colors.textLight} />
                        </View>
                    )}
                    {uploading && (
                        <View style={styles.loaderOverlay}>
                            <ActivityIndicator color="#fff" size="large" />
                        </View>
                    )}
                </Pressable>

                <Text style={styles.hint}>tap to choose a photo</Text>
            </Animated.View>

            <View style={styles.footer}>
                <Pressable
                    onPress={handleContinue}
                    style={[styles.button, !avatarUri && styles.buttonDisabled]}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>continue</Text>
                    )}
                </Pressable>

                <Pressable onPress={handleSkip} style={styles.skipButton}>
                    <Text style={styles.skipText}>skip for now</Text>
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
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textLight,
        marginBottom: 48,
        textAlign: 'center',
    },
    avatarContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 80,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 80,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hint: {
        fontSize: 14,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    footer: {
        padding: 24,
    },
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
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
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    skipButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    skipText: {
        fontSize: 16,
        color: Colors.textLight,
    },
});
