import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { decode } from 'base64-arraybuffer';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarSource } from '../../utils/soupUtils';
import { OnboardingSwipeForward } from '../../components/OnboardingSwipeForward';

// jpg/jpeg = real photos (camera roll). PNGs look like soup avatars / generated. Match community.jsx heuristic.
const isRealPhotoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const u = url.toLowerCase();
    return u.includes('.jpg') || u.includes('.jpeg') || u.includes('googleusercontent') || u.includes('fbsbx.com');
};

const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const SOUP_AVATARS = [
    { id: 'cereal', name: 'cereal soup', source: require('../../assets/images/avatars/cereal.png') },
    { id: 'tomato', name: 'tomato soup', source: require('../../assets/images/avatars/tomato_soup.png') },
    { id: 'salad', name: 'salad soup', source: require('../../assets/images/avatars/salad.png') },
    { id: 'acai', name: 'acai soup', source: require('../../assets/images/avatars/acai.png') },
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
    const [exampleAvatars, setExampleAvatars] = useState([]);

    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            const { data } = await supabase
                .from('app_users')
                .select('avatar_url')
                .not('id', 'eq', user.id)
                .not('avatar_url', 'is', null)
                .limit(24);
            const urls = (data || []).map((r) => r?.avatar_url).filter(Boolean);
            const photos = urls.filter(isRealPhotoUrl);
            setExampleAvatars(shuffle(photos));
        })();
    }, [user?.id]);

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant photo library access');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: Platform.OS === 'ios',
                aspect: [1, 1],
                quality: 0.3, // "Tiny Packet": Highly compressed to ensure safe transfer
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

    const handleSelectSoup = async (soup) => {
        try {
            setUploading(true);
            const asset = Asset.fromModule(soup.source);
            await asset.downloadAsync();
            setAvatarUri(asset.localUri || asset.uri);
            setSelectedSoupId(soup.id);
            setIsCustomPhoto(false);
        } catch (error) {
            console.error('Error loading soup avatar:', error);
            Alert.alert('Error', 'Failed to load soup avatar');
        } finally {
            setUploading(false);
        }
    };

    const processUpload = async () => {
        if (isCustomPhoto && !avatarUri) return;
        if (!isCustomPhoto && !selectedSoupId) return;

        setUploading(true);
        try {
            let finalAvatarUrl = null;

            if (!isCustomPhoto && selectedSoupId) {
                finalAvatarUrl = `soup://${selectedSoupId}`;
                await supabase
                    .from('app_users')
                    .update({ avatar_url: finalAvatarUrl })
                    .eq('id', user.id);
            } else {
                const isJpeg = avatarUri.toLowerCase().endsWith('.jpg') || avatarUri.toLowerCase().endsWith('.jpeg');
                const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
                const ext = isJpeg ? 'jpg' : 'png';
                const fileName = `avatar_${Date.now()}.${ext}`;
                const filePath = `${user.id}/${fileName}`;

                const formData = new FormData();
                formData.append('file', {
                    uri: avatarUri,
                    name: fileName,
                    type: mimeType,
                });

                const SUPABASE_URL = 'https://uspegyneclgkscxwmomn.supabase.co';
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;

                if (!accessToken) throw new Error('No auth session found');

                const response = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${filePath}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Upload failed');
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                finalAvatarUrl = publicUrl;
                await supabase
                    .from('app_users')
                    .update({ avatar_url: finalAvatarUrl })
                    .eq('id', user.id);
            }

            router.push('/(tabs)');

        } catch (error) {
            console.error('[Avatar] Error:', error);
            Alert.alert('Upload Failed', 'Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleSwipeForward = () => {
        if ((avatarUri || selectedSoupId) && !uploading) processUpload();
        else router.push('/(tabs)');
    };

    const handleSwipeBack = () => router.back();

    return (
        <SafeAreaView style={styles.container}>
            <OnboardingSwipeForward onSwipeForward={handleSwipeForward} onSwipeBack={handleSwipeBack}>
            <Pressable onPress={handleSwipeBack} style={styles.backRow} hitSlop={12}>
                <Text style={styles.backText}>← back</Text>
            </Pressable>
            <View style={styles.content}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
                        <Text style={styles.title}>add your profile pic 📸</Text>
                        <Text style={styles.subtitle}>a real photo helps your group recognize you. you can add one later if you're not ready</Text>

                        {exampleAvatars.length > 0 && (
                            <View style={styles.exampleRow}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.exampleAvatarsScrollContent}
                                    style={styles.exampleAvatarsScroll}
                                >
                                    {exampleAvatars.map((url, i) => (
                                        <Image key={`ex-${i}-${url?.slice(-20)}`} source={{ uri: url }} style={styles.exampleAvatar} />
                                    ))}
                                    {/* Soup avatars peek so people know to scroll */}
                                    {SOUP_AVATARS.slice(0, 4).map((soup) => (
                                        <View key={soup.id} style={styles.exampleAvatarPeek}>
                                            <Image source={soup.source} style={styles.exampleAvatar} resizeMode="contain" />
                                        </View>
                                    ))}
                                </ScrollView>
                                <Text style={styles.scrollHint}>scroll for more</Text>
                            </View>
                        )}

                        <Pressable onPress={pickImage} style={styles.avatarContainer}>
                            {avatarUri ? (
                                <Image source={getAvatarSource(avatarUri)} style={styles.avatar} />
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
                        <Text style={styles.sectionTitle}>or pick a soup for now 🙈</Text>
                        <Text style={styles.sectionSubtitle}>you can switch to a real photo anytime in settings</Text>

                        <View style={styles.soupRowWrap}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.soupScrollContent}
                            >
                                {SOUP_AVATARS.map((soup) => (
                                    <Pressable
                                        key={soup.id}
                                        style={[
                                            styles.soupOption,
                                            selectedSoupId === soup.id && styles.soupOptionSelected,
                                            uploading && { opacity: 0.5 }
                                        ]}
                                        onPress={() => handleSelectSoup(soup)}
                                        disabled={uploading}
                                    >
                                        <Image source={soup.source} style={styles.soupImage} resizeMode="contain" />
                                        <Text style={[
                                            styles.soupName,
                                            selectedSoupId === soup.id && styles.soupNameSelected
                                        ]}>{soup.name}</Text>
                                        {uploading && selectedSoupId === soup.id && (
                                            <View style={styles.loaderOverlay}>
                                                <ActivityIndicator color={Colors.primary} size="small" />
                                            </View>
                                        )}
                                    </Pressable>
                                ))}
                            </ScrollView>
                            <LinearGradient
                                colors={['transparent', Colors.background]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.soupPeekGradient}
                                pointerEvents="none"
                            />
                            <Text style={styles.soupScrollHint}>scroll for more</Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <Pressable
                    onPress={processUpload}
                    style={[styles.button, ((!avatarUri && !selectedSoupId) || uploading) && styles.buttonDisabled]}
                    disabled={uploading || (!avatarUri && !selectedSoupId)}
                >
                    {uploading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.buttonText}>loading...</Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>start slurping</Text>
                    )}
                </Pressable>
                <Pressable onPress={() => router.replace('/(tabs)')} style={styles.skipButton}>
                    <Text style={styles.skipText}>skip for now</Text>
                </Pressable>
            </View>
            </OnboardingSwipeForward>
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
    exampleRow: {
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        position: 'relative',
    },
    exampleAvatars: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
    },
    exampleAvatarsRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    exampleAvatarsScroll: {
        maxHeight: 120,
    },
    exampleAvatarsScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 6,
        paddingRight: 24,
    },
    exampleAvatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#f0f0f0',
    },
    exampleAvatarPeek: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#f0f0f0',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollFade: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 40,
        justifyContent: 'center',
    },
    scrollFadeGradient: {
        flex: 1,
        width: 40,
    },
    scrollHint: {
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 6,
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
        marginBottom: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    soupRowWrap: {
        position: 'relative',
        width: '100%',
    },
    soupScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 24,
        paddingRight: 56,
    },
    soupPeekGradient: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 48,
    },
    soupScrollHint: {
        fontSize: 12,
        color: Colors.textLight,
        textAlign: 'center',
        marginTop: 8,
    },
    soupOption: {
        width: 88,
        minWidth: 88,
        aspectRatio: 0.9,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    soupOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#F0F9FF',
    },
    soupImage: {
        width: '75%',
        height: '60%',
        marginBottom: 4,
    },
    soupName: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.textLight,
        textAlign: 'center',
        lineHeight: 12,
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
    backRow: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 4,
    },
    backText: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
    },
});
