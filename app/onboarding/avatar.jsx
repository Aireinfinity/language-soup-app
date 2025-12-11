import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { decode } from 'base64-arraybuffer';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Import delicious soups
const SOUP_AVATARS = [
    { id: 'cereal', name: 'cereal', source: require('../../assets/images/avatars/cereal.png') },
    { id: 'tomato', name: 'tomato soup', source: require('../../assets/images/avatars/tomato_soup.png') },
    { id: 'salad', name: 'salad dressing', source: require('../../assets/images/avatars/salad.png') },
    { id: 'acai', name: 'acai bowl', source: require('../../assets/images/avatars/acai.png') },
    { id: 'chicken', name: 'chicken soup', source: require('../../assets/images/avatars/chicken_soup.png') },
    { id: 'water', name: 'ice soup', source: require('../../assets/images/avatars/water_soup.png') },
    { id: 'bathtub', name: 'human soup', source: require('../../assets/images/avatars/bathtub_soup.png') },
];

export default function AvatarScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [avatarUri, setAvatarUri] = useState(null);
    const [selectedSoupId, setSelectedSoupId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isCustomPhoto, setIsCustomPhoto] = useState(false);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant photo library access');
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
                setIsCustomPhoto(true);
                setSelectedSoupId(null);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSelectSoup = (soup) => {
        // For local assets, we use the image module number temporarily for display
        // We'll process the asset upload on continue
        const asset = Asset.fromModule(soup.source);
        setAvatarUri(asset.uri);
        setSelectedSoupId(soup.id);
        setIsCustomPhoto(false);
    };

    const processUpload = async () => {
        if (!avatarUri) return;

        setUploading(true);
        try {
            let base64;
            let mimeType;

            if (isCustomPhoto) {
                // Read from local file system
                base64 = await FileSystem.readAsStringAsync(avatarUri, {
                    encoding: 'base64',
                });
                mimeType = 'image/jpeg';
            } else {
                // Handle local asset resource
                // Need to download it to cache first or use manipulation to get base64
                // A reliable way for Expo assets:
                const selectedSoup = SOUP_AVATARS.find(s => s.id === selectedSoupId);
                const asset = Asset.fromModule(selectedSoup.source);
                await asset.downloadAsync();

                base64 = await FileSystem.readAsStringAsync(asset.localUri, {
                    encoding: 'base64',
                });
                mimeType = 'image/png';
            }

            const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
            const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64), {
                    contentType: mimeType,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Save to profile
            await supabase
                .from('app_users')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            router.replace('/(tabs)');

        } catch (error) {
            console.error('Avatar upload error:', error);
            Alert.alert('Error', 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
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

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.soupSection}>
                        <Text style={styles.sectionTitle}>camera shy? 🙈</Text>
                        <Text style={styles.sectionSubtitle}>be some soup until you're ready to show off ur pretty face</Text>

                        <View style={styles.soupGrid}>
                            {SOUP_AVATARS.map((soup) => (
                                <Pressable
                                    key={soup.id}
                                    style={[
                                        styles.soupOption,
                                        selectedSoupId === soup.id && styles.soupOptionSelected
                                    ]}
                                    onPress={() => handleSelectSoup(soup)}
                                >
                                    <Image source={soup.source} style={styles.soupImage} resizeMode="contain" />
                                    <Text style={[
                                        styles.soupName,
                                        selectedSoupId === soup.id && styles.soupNameSelected
                                    ]}>{soup.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <Pressable
                    onPress={processUpload}
                    style={[styles.button, !avatarUri && styles.buttonDisabled]}
                    disabled={uploading || !avatarUri}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>start slurping</Text>
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
    },
    scrollContent: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        width: '100%',
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
        marginBottom: 32,
        textAlign: 'center',
    },
    avatarContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        position: 'relative',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 70,
        borderWidth: 4,
        borderColor: Colors.primary,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 70,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hint: {
        fontSize: 14,
        color: Colors.textLight,
        fontStyle: 'italic',
    },
    soupSection: {
        width: '100%',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: Colors.textLight,
        marginBottom: 24,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    soupGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
    },
    soupOption: {
        width: '30%', // roughly 3 per row
        aspectRatio: 0.85,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    soupOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F0F9FF', // Light blue tint
    },
    soupImage: {
        width: '80%',
        height: '70%',
        marginBottom: 8,
    },
    soupName: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 14,
    },
    soupNameSelected: {
        color: Colors.primary,
    },
    footer: {
        padding: 24,
        backgroundColor: Colors.background,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
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
});
