import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Alert, Text, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, Edit2, LogOut, MapPin, Globe, Award, Share2, Sparkles, Flag, Clock, Crown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { decode } from 'base64-arraybuffer';

// 🎨 SOUP PALETTE
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#1C1C1E',
    subtext: '#8E8E93',
    cardBg: '#FFFFFF',
};

export default function ProfileScreen() {
    const { user: authUser, signOut } = useAuth();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    // Editable States
    const [newName, setNewName] = useState('');
    const [newBio, setNewBio] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newOrigin, setNewOrigin] = useState('');
    const [newLanguages, setNewLanguages] = useState(''); // Comma separated
    const [newLearning, setNewLearning] = useState(''); // Comma separated
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (authUser) {
            loadProfile();
        }
    }, [authUser]);

    const loadProfile = async () => {
        try {
            const { data: userData } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (userData) {
                setUser(userData);
                setNewName(userData.display_name);
                setNewBio(userData.bio || '');
                setNewLocation(userData.location || '');
                setNewOrigin(userData.origin || '');
                setNewLanguages((userData.fluent_languages || []).join(', '));
                setNewLearning((userData.learning_languages || []).join(', '));
            }

            const { data: groupData } = await supabase
                .from('app_group_members')
                .select('app_groups ( id, name, language )')
                .eq('user_id', authUser.id);

            if (groupData) {
                setGroups(groupData.map(g => g.app_groups));
            }

            const { data: statsData } = await supabase
                .rpc('get_user_stats', { uid: authUser.id });

            if (statsData) {
                setStats(statsData);
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const langArray = newLanguages.split(',').map(l => l.trim()).filter(l => l.length > 0);
            const learningArray = newLearning.split(',').map(l => l.trim()).filter(l => l.length > 0);

            const updates = {
                display_name: newName.trim(),
                bio: newBio.trim(),
                location: newLocation.trim(),
                origin: newOrigin.trim(),
                fluent_languages: langArray,
                learning_languages: learningArray
            };

            const { error } = await supabase
                .from('app_users')
                .update(updates)
                .eq('id', authUser.id);

            if (error) throw error;

            setUser(prev => ({ ...prev, ...updates }));
            setEditing(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Permission Required', 'Needs photo access');

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
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const filePath = `${authUser.id}/avatar-${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage.from('avatars')
                .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
            await supabase.from('app_users').update({ avatar_url: publicUrl }).eq('id', authUser.id);
            setUser(prev => ({ ...prev, avatar_url: publicUrl }));
        } catch (error) {
            Alert.alert('Error', 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.pink} />
            </View>
        );
    }

    // --- RENDER HELPERS ---

    const renderIdentity = () => (
        <View style={styles.identitySection}>
            <Pressable onPress={pickImage} style={styles.avatarContainer}>
                {user?.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{user?.display_name?.[0]?.toUpperCase() || '?'}</Text>
                    </View>
                )}
                <View style={styles.editBadge}>
                    <Camera size={14} color="#fff" />
                </View>
            </Pressable>

            {editing ? (
                <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>Name</Text>
                    <TextInput
                        style={styles.nameInput}
                        value={newName}
                        onChangeText={setNewName}
                        placeholder="Name"
                    />

                    <Text style={styles.inputLabel}>Bio</Text>
                    <TextInput
                        style={styles.bioInput}
                        value={newBio}
                        onChangeText={setNewBio}
                        placeholder="Short bio..."
                        multiline
                    />

                    <View style={styles.inputRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>Location (Live)</Text>
                            <TextInput
                                style={styles.locationInput}
                                value={newLocation}
                                onChangeText={setNewLocation}
                                placeholder="e.g. NYC"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>From (Origin)</Text>
                            <TextInput
                                style={styles.locationInput}
                                value={newOrigin}
                                onChangeText={setNewOrigin}
                                placeholder="e.g. Brazil"
                            />
                        </View>
                    </View>

                    <Text style={styles.inputLabel}>Fluent Languages (Comma separated)</Text>
                    <TextInput
                        style={styles.locationInput}
                        value={newLanguages}
                        onChangeText={setNewLanguages}
                        placeholder="e.g. English, Spanish"
                    />

                    <Text style={styles.inputLabel}>Cooking Up / Learning (Comma separated)</Text>
                    <TextInput
                        style={styles.locationInput}
                        value={newLearning}
                        onChangeText={setNewLearning}
                        placeholder="e.g. French, Korean"
                    />

                    <Pressable onPress={handleSave} style={styles.saveBtn}>
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                    </Pressable>
                </View>
            ) : (
                <View style={styles.infoCenter}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{user?.display_name || 'Anonymous Souper'}</Text>
                        <Pressable onPress={() => setEditing(true)} hitSlop={10}>
                            <Edit2 size={16} color={SOUP_COLORS.subtext} />
                        </Pressable>
                    </View>

                    {/* Flags / Origin - Hardcoded for demo/user input needed */}
                    <View style={styles.pillRow}>
                        {user.origin ? (
                            <View style={styles.pill}>
                                <Text style={styles.pillText}>From {user.origin} 🌏</Text>
                            </View>
                        ) : null}
                        {user.location ? (
                            <View style={[styles.pill, styles.pillBlue]}>
                                <MapPin size={10} color="#fff" />
                                <Text style={[styles.pillText, { color: '#fff' }]}>{user.location}</Text>
                            </View>
                        ) : null}
                    </View>

                    {user.bio ? <Text style={styles.bio}>"{user.bio}"</Text> : null}

                    {/* Fluent Languages */}
                    {user.fluent_languages && user.fluent_languages.length > 0 && (
                        <View style={styles.langRow}>
                            <Text style={styles.labelSmall}>I speak fluently:</Text>
                            <View style={styles.langChips}>
                                {user.fluent_languages.map((lang, i) => (
                                    <View key={i} style={styles.chip}>
                                        <Text style={styles.chipText}>{lang}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Learning Languages */}
                    {user.learning_languages && user.learning_languages.length > 0 && (
                        <View style={[styles.langRow, { marginTop: 8 }]}>
                            <Text style={styles.labelSmall}>Cooking up:</Text>
                            <View style={styles.langChips}>
                                {user.learning_languages.map((lang, i) => (
                                    <View key={i} style={[styles.chip, styles.chipYellow]}>
                                        <Text style={styles.chipText}>{lang}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    // --- HELPERS ---

    const getCEFRProgress = (seconds) => {
        const hours = seconds / 3600;

        // Cumulative thresholds (approximate for casual learning)
        const levels = [
            { label: 'A1', min: 0, max: 80 },
            { label: 'A2', min: 80, max: 200 },
            { label: 'B1', min: 200, max: 400 },
            { label: 'B2', min: 400, max: 600 },
            { label: 'C1', min: 600, max: 800 },
            { label: 'C2', min: 800, max: 1200 },
        ];

        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            if (hours < level.max) {
                const range = level.max - level.min;
                const progressInLevel = hours - level.min;
                const percent = (progressInLevel / range) * 100;

                return {
                    currentLevel: i === 0 ? 'Novice' : levels[i - 1].label,
                    targetLevel: level.label,
                    progressPercent: Math.min(Math.max(percent, 0), 100),
                    hoursRemaining: (level.max - hours).toFixed(1),
                    nextMilestone: level.max
                };
            }
        }
        return { currentLevel: 'C2', targetLevel: 'Master', progressPercent: 100, hoursRemaining: 0 };
    };

    const renderStats = () => (
        <View style={styles.statsSection}>
            <View style={styles.bigStatCard}>
                <Text style={styles.bigStatLabel}>Total Voice Memos Sent</Text>
                <Text style={styles.bigStatNumber}>
                    {Math.floor((stats?.total_speaking_seconds || 0) / 10)}
                </Text>
            </View>

            <Text style={styles.sectionTitle}>Journey to Fluency 🎓</Text>
            {(stats?.flavor_breakdown || []).map((lang, idx) => {
                const cefr = getCEFRProgress(lang.seconds || 0);

                return (
                    <View key={idx} style={styles.progressRow}>
                        <View style={styles.progressHeader}>
                            <View>
                                <Text style={styles.progressLang}>{lang.language}</Text>
                                <Text style={styles.levelBadge}>{cefr.currentLevel} → {cefr.targetLevel}</Text>
                            </View>
                            <Text style={styles.progressVal}>{cefr.hoursRemaining} hrs to {cefr.targetLevel}</Text>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${cefr.progressPercent}%` }]} />
                        </View>
                    </View>
                );
            })}
        </View>
    );

    const renderWrapped = () => (
        <View style={styles.wrappedContainer}>
            <LinearGradient
                colors={[SOUP_COLORS.text, '#000']} // Sleek Dark Mode
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.wrappedCard}
            >
                <Text style={styles.wrappedTitle}>Your Monthly Mix 📼</Text>

                <View style={styles.trackList}>
                    {/* Track 1: Top Language */}
                    <View style={styles.trackRow}>
                        <Text style={styles.trackNum}>1</Text>
                        <View style={styles.trackInfo}>
                            <Text style={styles.trackTitle}>Top Liquid</Text>
                            <Text style={styles.trackSubtitle}>{stats?.monthly_top_language || 'None Yet'}</Text>
                        </View>
                        <Text style={styles.trackStat}>{Math.floor((stats?.monthly_top_language_seconds || 0) / 60)}m</Text>
                    </View>

                    {/* Track 2: Total Memos */}
                    <View style={styles.trackRow}>
                        <Text style={styles.trackNum}>2</Text>
                        <View style={styles.trackInfo}>
                            <Text style={styles.trackTitle}>Voice Memos</Text>
                            <Text style={styles.trackSubtitle}>Total Sent</Text>
                        </View>
                        <Text style={styles.trackStat}>{Math.floor((stats?.monthly_speaking_seconds || 0) / 15)}</Text>
                    </View>

                    {/* Track 3: Consistency */}
                    <View style={styles.trackRow}>
                        <Text style={styles.trackNum}>3</Text>
                        <View style={styles.trackInfo}>
                            <Text style={styles.trackTitle}>Vibe Check</Text>
                            <Text style={styles.trackSubtitle}>Consistency Level</Text>
                        </View>
                        <Text style={styles.trackStat}>{stats?.consistency_label || 'New'}</Text>
                    </View>
                </View>

                <View style={styles.wrappedFooter}>
                    <Text style={styles.wrappedBranding}>LANGUAGE SOUP WRAPPED '25 🍜</Text>
                    <Share2 color="rgba(255,255,255,0.6)" size={16} />
                </View>
            </LinearGradient>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                {/* Sign Out - Top Left */}
                <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
                    <LogOut size={20} color={SOUP_COLORS.pink} />
                </Pressable>

                {/* Admin Buttons - Top Right */}
                <View style={styles.headerRight}>
                    {user?.role === 'community_manager' && (
                        <Pressable
                            onPress={() => router.push('/admin/community-dashboard')}
                            style={styles.managerBtn}
                        >
                            <Award size={16} color={SOUP_COLORS.green} />
                            <Text style={styles.managerBtnText}>Community Manager</Text>
                        </Pressable>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {renderIdentity()}
                {renderStats()}
                {renderWrapped()}
                <View style={{ height: 40 }} />
            </ScrollView>
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
        backgroundColor: SOUP_COLORS.cream,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    signOutBtn: {
        padding: 8,
        backgroundColor: 'rgba(236, 0, 139, 0.1)',
        borderRadius: 20,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    adminBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: `${SOUP_COLORS.yellow}20`,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: SOUP_COLORS.yellow,
    },
    adminBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.yellow,
    },
    managerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: `${SOUP_COLORS.green}20`,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: SOUP_COLORS.green,
    },
    managerBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.green,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    // IDENTITY
    identitySection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: SOUP_COLORS.blue,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 40,
        color: '#fff',
        fontWeight: 'bold',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: SOUP_COLORS.pink,
        padding: 6,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: SOUP_COLORS.cream,
    },
    infoCenter: {
        alignItems: 'center',
        width: '100%',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        letterSpacing: -0.5,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    pill: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pillBlue: {
        backgroundColor: SOUP_COLORS.blue,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    bio: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 16,
        marginHorizontal: 20,
    },
    langRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    labelSmall: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontWeight: '600',
    },
    langChips: {
        flexDirection: 'row',
        gap: 6,
    },
    chip: {
        backgroundColor: SOUP_COLORS.green,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    chipYellow: {
        backgroundColor: '#FFC107', // Amber/Yellow for learning
    },
    chipText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    // STATS
    statsSection: {
        marginBottom: 30,
    },
    bigStatCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 24,
    },
    bigStatLabel: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    bigStatNumber: {
        fontSize: 42,
        fontWeight: '900',
        color: SOUP_COLORS.blue,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 16,
        marginLeft: 4,
    },
    progressRow: {
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    progressLang: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    levelBadge: {
        fontSize: 12,
        color: SOUP_COLORS.pink,
        fontWeight: '700',
        marginTop: 2,
    },
    progressVal: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 6,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: SOUP_COLORS.green,
        borderRadius: 6,
    },
    // WRAPPED - Spotify Style
    wrappedContainer: {
        marginTop: 10,
        marginBottom: 40,
    },
    wrappedCard: {
        borderRadius: 24,
        padding: 24,
        minHeight: 280,
    },
    wrappedTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 24,
        letterSpacing: -1,
    },
    trackList: {
        gap: 20,
        marginBottom: 30,
    },
    trackRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trackNum: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'rgba(255,255,255,0.4)',
        width: 24,
    },
    trackInfo: {
        flex: 1,
        marginLeft: 8,
    },
    trackTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    trackSubtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '500',
    },
    trackStat: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    wrappedFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 16,
    },
    wrappedBranding: {
        fontSize: 10,
        color: 'rgba(255,255,255, 0.5)',
        fontWeight: '800',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    // Editing styles...
    editForm: {
        width: '100%',
        gap: 12,
    },
    nameInput: {
        fontSize: 18,
        fontWeight: '600',
        borderBottomWidth: 1,
        borderColor: SOUP_COLORS.blue,
        padding: 8,
    },
    bioInput: {
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        minHeight: 60,
        backgroundColor: '#fff',
    },
    locationInput: {
        fontSize: 14,
        borderBottomWidth: 1,
        borderColor: '#ddd',
        padding: 8,
    },
    saveBtn: {
        backgroundColor: SOUP_COLORS.blue,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
        marginBottom: 4,
        marginTop: 8,
        textTransform: 'uppercase',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
    },
});
