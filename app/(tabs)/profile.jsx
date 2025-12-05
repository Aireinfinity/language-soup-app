import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, Edit2, LogOut } from 'lucide-react-native';
import { ThemedText } from '../../components/ThemedText';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { decode } from 'base64-arraybuffer';

export default function ProfileScreen() {
    const { user: authUser, signOut } = useAuth();
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (authUser) {
            loadProfile();
        }
    }, [authUser]);

    const loadProfile = async () => {
        try {
            // Load user data
            const { data: userData } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (userData) {
                setUser(userData);
                setNewName(userData.display_name);
            }

            // Load user's groups
            const { data: groupData } = await supabase
                .from('app_group_members')
                .select(`
                    app_groups (
                        id,
                        name,
                        language,
                        level,
                        member_count
                    )
                `)
                .eq('user_id', authUser.id);

            if (groupData) {
                setGroups(groupData.map(g => g.app_groups));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

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
                await uploadAvatar(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    const uploadAvatar = async (uri) => {
        setUploading(true);
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            const filePath = `${authUser.id}/avatar-${Date.now()}.jpg`;

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

            // Update user profile
            const { error } = await supabase
                .from('app_users')
                .update({ avatar_url: publicUrl })
                .eq('id', authUser.id);

            if (error) throw error;

            setUser(prev => ({ ...prev, avatar_url: publicUrl }));
        } catch (error) {
            console.error('Avatar upload error:', error);
            Alert.alert('Error', 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const saveName = async () => {
        if (!newName.trim()) return;

        try {
            const { error } = await supabase
                .from('app_users')
                .update({ display_name: newName.trim() })
                .eq('id', authUser.id);

            if (error) throw error;

            setUser(prev => ({ ...prev, display_name: newName.trim() }));
            setEditing(false);
        } catch (error) {
            console.error('Error updating name:', error);
            Alert.alert('Error', 'Failed to update name');
        }
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: signOut }
        ]);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={pickImage} style={styles.avatarContainer}>
                        {user?.avatar_url ? (
                            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Camera size={32} color={Colors.textLight} />
                            </View>
                        )}
                        {uploading && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        )}
                        <View style={styles.cameraIcon}>
                            <Camera size={16} color="#fff" />
                        </View>
                    </Pressable>

                    {editing ? (
                        <View style={styles.nameEdit}>
                            <TextInput
                                style={styles.nameInput}
                                value={newName}
                                onChangeText={setNewName}
                                autoFocus
                            />
                            <Pressable onPress={saveName} style={styles.saveButton}>
                                <ThemedText style={styles.saveText}>Save</ThemedText>
                            </Pressable>
                        </View>
                    ) : (
                        <Pressable onPress={() => setEditing(true)} style={styles.nameContainer}>
                            <ThemedText style={styles.name}>{user?.display_name || 'User'}</ThemedText>
                            <Edit2 size={20} color={Colors.textLight} />
                        </Pressable>
                    )}

                    <ThemedText style={styles.status}>{user?.status_text || 'Hey there!'}</ThemedText>
                </View>

                {/* Joined Groups */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Your Groups ({groups.length})</ThemedText>
                    {groups.map((group) => (
                        <View key={group.id} style={styles.groupCard}>
                            <View style={styles.groupInfo}>
                                <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                                <ThemedText style={styles.groupMeta}>
                                    {group.language} • {group.level || 'All Levels'} • {group.member_count} members
                                </ThemedText>
                            </View>
                        </View>
                    ))}
                </View>

                <Pressable onPress={handleSignOut} style={styles.signOutButton}>
                    <LogOut size={20} color={Colors.error} />
                    <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // cream
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
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
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
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
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    nameEdit: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    nameInput: {
        fontSize: 24,
        fontWeight: 'bold',
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary,
        paddingVertical: 4,
        minWidth: 150,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    saveText: {
        color: '#fff',
        fontWeight: '600',
    },
    status: {
        fontSize: 14,
        color: Colors.textLight,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        marginBottom: 8,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    groupMeta: {
        fontSize: 14,
        color: Colors.textLight,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#ffe5e5',
    },
    signOutText: {
        color: Colors.error,
        fontSize: 16,
        fontWeight: '600',
    },
});
