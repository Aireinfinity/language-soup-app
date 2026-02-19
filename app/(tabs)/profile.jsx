import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Alert, Text, Switch, Modal, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, Edit2, LogOut, MapPin, Globe, Award, Sparkles, Flag, Clock, Crown, Download, MessageCircle, Bell, HelpCircle, ChevronRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { decode } from 'base64-arraybuffer';
import { useQuests } from '../../contexts/QuestContext';
import { useNotifications } from '../../contexts/NotificationContext';
import GroupAvatar from '../../components/GroupAvatar';
import WhatsNewSheet from '../../components/WhatsNewSheet';
import { getAvatarSource } from '../../utils/soupUtils';
import { getOutputLevel, getInputLevel } from '../../utils/levelHelpers';
import { TAB_BAR_HEIGHT } from '../../constants/Layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🎨 SOUP PALETTE (matches dashboard: turquoise, pink, green, linen)
const SOUP_COLORS = {
    blue: '#00adef',
    turquoise: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    linen: '#FDF5E6',
    text: '#1b1b2f',
    dark: '#1b1b2f',
    subtext: '#8E8E93',
    cardBg: '#FFFFFF',
};

const EXAMPLE_TAGLINES = [
    'founder daddy',
    'scared to send voice memos',
    'rambler',
    'lurker',
    'community momager',
    'slay slay slay',
    'always late to challenges',
    'polyglot in training',
];

const SOUP_AVATARS = [
    { id: 'cereal', name: 'cereal soup', source: require('../../assets/images/avatars/cereal.png') },
    { id: 'tomato', name: 'tomato soup', source: require('../../assets/images/avatars/tomato_soup.png') },
    { id: 'salad', name: 'salad soup', source: require('../../assets/images/avatars/salad.png') },
    { id: 'acai', name: 'acai soup', source: require('../../assets/images/avatars/acai.png') },
    { id: 'chicken', name: 'chicken soup', source: require('../../assets/images/avatars/chicken_soup.png') },
    { id: 'water', name: 'ice soup', source: require('../../assets/images/avatars/water_soup.png') },
    { id: 'bathtub', name: 'human soup', source: require('../../assets/images/avatars/bathtub_soup.png') },
];

export default function ProfileScreen() {
    const { user: authUser, signOut } = useAuth();
    const { permissionStatus, openSettings, checkPermissions } = useNotifications();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [scrollContentHeight, setScrollContentHeight] = useState(SCREEN_HEIGHT - TAB_BAR_HEIGHT);
    const [user, setUser] = useState(null);
    const [groups, setGroups] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    // Editable States
    const [newName, setNewName] = useState('');
    const [newTagline, setNewTagline] = useState('');
    const [newBio, setNewBio] = useState('');
    const [newTimezone, setNewTimezone] = useState('');
    const [newLanguages, setNewLanguages] = useState([]);
    const [newLearning, setNewLearning] = useState([]);
    const [availableLanguages, setAvailableLanguages] = useState([]);
    const [availableTimezones, setAvailableTimezones] = useState([]);
    const [languageSearch, setLanguageSearch] = useState('');
    const [learningSearch, setLearningSearch] = useState('');
    const [timezoneSearch, setTimezoneSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [newSoupFlavor, setNewSoupFlavor] = useState('');
    const [statsTab, setStatsTab] = useState('input'); // 'input' | 'output'
    const [showLevelsInfo, setShowLevelsInfo] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState(null); // For optimistic UI updates
    const [selectedSoupId, setSelectedSoupId] = useState(null);
    const [learningExpanded, setLearningExpanded] = useState(false);
    const [fluentExpanded, setFluentExpanded] = useState(false);
    const [showWhatsNewSheet, setShowWhatsNewSheet] = useState(false);
    const [sharePreference, setSharePreference] = useState('private'); // 'public' | 'private'
    const { completeQuest } = useQuests();

    useEffect(() => {
        if (authUser) {
            loadProfile();
            // Complete quest for viewing profile
            completeQuest('view_profile');
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
                setNewTagline(userData.status_text || '');
                setNewBio(userData.bio || '');
                setNewTimezone(userData.timezone || '');
                setNewLanguages(userData.fluent_languages || []);
                setNewLearning(userData.learning_languages || []);
                setSharePreference(userData.share_preference === 'public' ? 'public' : 'private');
            } else {
                // FALLBACK FOR GUEST / MISSING PROFILE
                const guestUser = {
                    display_name: 'Guest Souper',
                    bio: 'Just looking around! 👀',
                    origin: 'Unknown',
                    location: 'Earth',
                    fluent_languages: [],
                    learning_languages: [],
                    avatar_url: null,
                    role: 'guest'
                };
                setUser(guestUser);
            }

            const { data: groupData } = await supabase
                .from('app_group_members')
                .select('app_groups ( id, name, language )')
                .eq('user_id', authUser.id);

            if (groupData) {
                const userGroups = groupData.map(item => item.app_groups);
                setGroups(userGroups);
            }

            // Always load language and timezone lists for profile editing
            {
                const allLanguages = [
                    'Afrikaans', 'Akan', 'Albanian', 'Amharic',
                    'Arabic (Modern Standard)', 'Arabic (Egyptian)', 'Arabic (Levantine)', 'Arabic (Gulf)', 'Arabic (Maghrebi)', 'Arabic (Sudanese)',
                    'Armenian', 'Assamese', 'Aymara', 'Azerbaijani',
                    'Bambara', 'Basque', 'Belarusian', 'Bengali', 'Bhojpuri', 'Bosnian', 'Breton', 'Bulgarian', 'Burmese',
                    'Catalan', 'Cantonese', 'Cebuano', 'Cherokee', 'Chewa', 'Chinese (Mandarin) / 中文', 'Chinese (Hakka)', 'Chinese (Hokkien)', 'Chinese (Wu)',
                    'Corsican', 'Cree', 'Croatian', 'Czech',
                    'Danish', 'Dari', 'Divehi', 'Dogri', 'Dutch / Nederlands',
                    'English (US)', 'English (UK)', 'English (Australian)', 'English (Canadian)', 'Esperanto', 'Estonian', 'Ewe',
                    'Faroese', 'Fijian', 'Filipino', 'Finnish', 'French / Français', 'French (Canadian)', 'Frisian', 'Fulani',
                    'Galician', 'Ganda', 'Georgian', 'German / Deutsch', 'German (Swiss)', 'Greek / Ελληνικά', 'Guarani', 'Gujarati',
                    'Haitian Creole', 'Hausa', 'Hawaiian', 'Hebrew / עברית', 'Hindi / हिन्दी', 'Hmong', 'Hungarian / Magyar',
                    'Icelandic', 'Igbo', 'Ilocano', 'Indonesian', 'Inuktitut', 'Irish', 'Italian / Italiano',
                    'Japanese / 日本語', 'Javanese',
                    'Kannada', 'Kazakh', 'Khmer', 'Kinyarwanda', 'Konkani', 'Korean / 한국어', 'Kurdish (Kurmanji)', 'Kurdish (Sorani)', 'Kyrgyz',
                    'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luganda', 'Luxembourgish',
                    'Macedonian', 'Maithili', 'Malagasy', 'Malay', 'Malayalam', 'Maltese', 'Manx', 'Maori', 'Marathi', 'Mayan', 'Mongolian',
                    'Nahuatl', 'Navajo', 'Nepali', 'Norwegian',
                    'Occitan', 'Odia', 'Oromo',
                    'Pashto', 'Persian (Farsi) / فارسی', 'Polish / Polski',
                    'Portuguese (Brazil) / Português', 'Portuguese (Portugal)',
                    'Punjabi',
                    'Quechua',
                    'Romanian', 'Romansh', 'Russian / Русский',
                    'Samoan', 'Sanskrit', 'Scots Gaelic', 'Serbian', 'Sesotho', 'Shona', 'Sindhi', 'Sinhala', 'Slovak', 'Slovenian', 'Somali',
                    'Spanish (Spain) / Español', 'Spanish (Latin America)', 'Spanish (Rioplatense)',
                    'Sundanese', 'Swahili', 'Swedish / Svenska',
                    'Tagalog', 'Tahitian', 'Tajik', 'Tamil', 'Tatar', 'Telugu', 'Thai / ไทย', 'Tibetan', 'Tigrinya', 'Tonga', 'Tswana', 'Turkish / Türkçe', 'Turkmen', 'Twi',
                    'Ukrainian / Українська', 'Urdu', 'Uyghur', 'Uzbek',
                    'Vietnamese / Tiếng Việt',
                    'Welsh', 'Wolof',
                    'Xhosa',
                    'Yiddish', 'Yoruba',
                    'Zulu'
                ].sort();
                setAvailableLanguages(allLanguages);

                const allTimezones = [
                    'UTC', 'GMT',
                    'EST', 'CST', 'MST', 'PST',
                    'EDT', 'CDT', 'MDT', 'PDT',
                    'CET', 'CEST', 'EET', 'EEST', 'WET', 'WEST',
                    'JST', 'KST', 'CST (China)', 'IST (India)',
                    'AEST', 'ACST', 'AWST',
                    'NZST', 'NZDT',
                    'HST', 'AKST', 'AST'
                ].sort();
                setAvailableTimezones(allTimezones);
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
        // Optimistic update - update local state immediately
        const updates = {
            display_name: (newName || '').trim(),
            status_text: (newTagline || '').trim(),
            bio: (newBio || '').trim(),
            timezone: (newTimezone || '').trim(),
            fluent_languages: newLanguages || [],
            learning_languages: newLearning || [],
            share_preference: sharePreference || 'private'
        };

        // Update local user object immediately so UI reflects changes
        setUser(prev => ({ ...prev, ...updates }));
        setEditing(false); // Close modal immediately

        try {
            // Send to backend in background
            const { error } = await supabase
                .from('app_users')
                .update(updates)
                .eq('id', authUser.id);

            if (error) {
                console.error('Error saving profile (background):', error);
                // Optionally show a silent toast or just retry later
                // adhering to request "let it save if anything happens" - we don't block UI
            }
        } catch (error) {
            console.error('Crash saving profile:', error);
        }
    };

    const pickImage = async () => {
        try {
            console.log('[Profile] pickImage called');
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log('[Profile] Permission status:', status);
            if (status !== 'granted') return Alert.alert('Permission Required', 'Needs photo access');

            console.log('[Profile] Launching image picker...');
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: Platform.OS === 'ios', // Only enable crop editor on iOS (Android UI is inconsistent)
                aspect: [1, 1],
                quality: 0.5, // Reduced quality for faster uploads
            });

            console.log('[Profile] Picker result:', { canceled: result.canceled, hasAssets: !!result.assets?.[0] });
            if (!result.canceled && result.assets[0]) {
                const uri = result.assets[0].uri;
                setPreviewAvatar(uri); // Show immediately
                console.log('[Profile] Starting upload...');
                await uploadAvatar(uri, true);
            }
        } catch (error) {
            console.error('[Profile] Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const handleSelectSoup = async (soup) => {
        try {
            setUploading(true);
            setSelectedSoupId(soup.id);
            const soupUrl = `soup://${soup.id}`;
            await supabase.from('app_users').update({ avatar_url: soupUrl }).eq('id', authUser.id);
            setUser(prev => ({ ...prev, avatar_url: soupUrl }));
            setPreviewAvatar(soupUrl);
            setShowAvatarPicker(false);
        } catch (error) {
            console.error('Error selecting soup:', error);
            Alert.alert('Error', 'Failed to select soup avatar');
            setShowAvatarPicker(false);
        } finally {
            setUploading(false);
        }
    };

    const uploadAvatar = async (uri, isCustomPhoto = true) => {
        setUploading(true);
        try {
            // "Raw Wire" Strategy: Bypass supabase-js client completely for upload
            // This fixes the [StorageUnknownError: Network request failed] on Android

            const ext = isCustomPhoto ? 'jpg' : 'png';
            const fileName = `avatar-${Date.now()}.${ext}`;
            const filePath = `${authUser.id}/${fileName}`;

            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                name: fileName,
                type: isCustomPhoto ? 'image/jpeg' : 'image/png',
            });

            const SUPABASE_URL = 'https://uspegyneclgkscxwmomn.supabase.co';

            // CRITICAL FIX: Use the USER'S access token, NOT the anon key
            // The RLS policy checks for auth.uid(), so we need the user's identity
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            if (!accessToken) throw new Error('No auth session found');

            // 1. Upload directly via REST API with User Token
            const response = await fetch(`${SUPABASE_URL}/storage/v1/object/avatars/${filePath}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`, // <--- THIS IS THE FIX
                    // 'apikey': SUPABASE_ANON_KEY, // Not strictly needed if Bearer is valid, but safe to keep
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Upload failed');
            }

            // 2. Get Public URL (Low risk, standard client is fine here)
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            // 3. Update Profile
            await supabase.from('app_users').update({ avatar_url: publicUrl }).eq('id', authUser.id);
            setUser(prev => ({ ...prev, avatar_url: publicUrl }));

        } catch (error) {
            console.error('Avatar upload failed:', error);
            Alert.alert('Error', `Failed to upload avatar: ${error.message || 'Unknown error'}`);
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

    const showAvatarOptions = () => {
        // Use modal for both platforms for consistency
        // Android implementation at lines 1266-1323 already works perfectly
        setShowAvatarPicker(true);
    };

    const renderIdentity = () => (
        <View style={styles.heroSection}>
            <View style={styles.heroCard}>
            {/* Hero Layout: Flags | Photo | Flags (same when view or edit) */}
            <View style={styles.heroPhotoRow}>
                <View style={styles.flagColumn}>
                    {(editing ? newLearning : user.learning_languages)?.length > 0 && (
                        <>
                            <Text style={styles.flagColumnTitle} numberOfLines={1}>LEARNING 🌱</Text>
                            <View style={styles.flagList}>
                                {((editing ? newLearning : user.learning_languages) || []).slice(0, learningExpanded || editing ? 99 : 3).map((lang, i) => (
                                    <Text key={`learning-${i}`} style={styles.flagEmoji}>
                                        {getLanguageFlag(lang)}
                                    </Text>
                                ))}
                                {!editing && (user.learning_languages?.length || 0) > 3 && (
                                    <Pressable onPress={() => setLearningExpanded(!learningExpanded)} style={({ pressed }) => pressed && { opacity: 0.8 }}>
                                        <Text style={styles.expandButton}>
                                            {learningExpanded ? '- Less' : `+${(user.learning_languages?.length || 0) - 3} more`}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        </>
                    )}
                </View>

                <Pressable onPress={showAvatarOptions} style={({ pressed }) => [styles.heroAvatarContainer, !uploading && pressed && { opacity: 0.9 }]} disabled={uploading}>
                    {previewAvatar || user?.avatar_url ? (
                        <Image
                            source={getAvatarSource(previewAvatar || user.avatar_url)}
                            style={[styles.heroAvatar, uploading && { opacity: 0.5 }]}
                        />
                    ) : (
                        <View style={[styles.heroAvatarPlaceholder, uploading && { opacity: 0.5 }]}>
                            <Text style={styles.heroAvatarInitial}>{(editing ? newName : user?.display_name)?.[0]?.toUpperCase() || '?'}</Text>
                        </View>
                    )}
                    {uploading && (
                        <View style={StyleSheet.absoluteFill}>
                            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 40, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator color="#fff" size="small" />
                            </View>
                        </View>
                    )}
                    {!uploading && (
                        <View style={styles.heroEditBadge}>
                            <Camera size={16} color="#fff" />
                        </View>
                    )}
                </Pressable>

                <View style={styles.flagColumn}>
                    {(editing ? newLanguages : user.fluent_languages)?.length > 0 && (
                        <>
                            <Text style={styles.flagColumnTitle} numberOfLines={1}>CONVERSATIONAL 💬</Text>
                            <View style={styles.flagList}>
                                {((editing ? newLanguages : user.fluent_languages) || []).slice(0, fluentExpanded || editing ? 99 : 3).map((lang, i) => (
                                    <Text key={`fluent-${i}`} style={styles.flagEmoji}>
                                        {getLanguageFlag(lang)}
                                    </Text>
                                ))}
                                {!editing && (user.fluent_languages?.length || 0) > 3 && (
                                    <Pressable onPress={() => setFluentExpanded(!fluentExpanded)} style={({ pressed }) => pressed && { opacity: 0.8 }}>
                                        <Text style={styles.expandButton}>
                                            {fluentExpanded ? '- Less' : `+${(user.fluent_languages?.length || 0) - 3} more`}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Name: editable inline */}
            <View style={styles.heroNameRow}>
                {editing ? (
                    <TextInput
                        style={styles.heroNameInput}
                        value={newName}
                        onChangeText={setNewName}
                        placeholder="your name"
                        placeholderTextColor={SOUP_COLORS.subtext}
                    />
                ) : (
                    <Text style={styles.heroName}>{user?.display_name || 'Anonymous Souper'}</Text>
                )}
                {!editing ? (
                    <Pressable onPress={() => setEditing(true)} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.8 }}>
                        <Edit2 size={20} color={SOUP_COLORS.blue} />
                    </Pressable>
                ) : null}
            </View>

            {/* Tagline: editable inline */}
            {editing ? (
                <>
                    <TextInput
                        style={styles.heroTaglineInput}
                        value={newTagline}
                        onChangeText={setNewTagline}
                        placeholder='your tagline...'
                        placeholderTextColor={SOUP_COLORS.subtext}
                        maxLength={50}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flavorScroll}>
                        {EXAMPLE_TAGLINES.map(tag => (
                            <Pressable
                                key={tag}
                                style={[styles.flavorChip, newTagline === tag && styles.flavorChipSelected]}
                                onPress={() => setNewTagline(tag)}
                            >
                                <Text style={[styles.flavorChipText, newTagline === tag && styles.flavorChipTextSelected]}>{tag}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </>
            ) : (
                user?.status_text ? (
                    <View style={styles.taglinePill}>
                        <Text style={styles.heroTagline}>"{user.status_text}"</Text>
                    </View>
                ) : null
            )}

            {/* Progress bars only (name, tagline, then bars) */}
            {!editing && stats && (() => {
                const totalSpeakSeconds = stats.total_speaking_seconds ?? 0;
                const speakMinutes = totalSpeakSeconds / 60;
                const listenHours = (totalSpeakSeconds * 2) / 3600;
                const outLevel = getOutputLevel(speakMinutes);
                const inLevel = getInputLevel(listenHours);
                const outProgress = outLevel.maxed ? 100 : Math.min(100, Math.max(5, ((speakMinutes - outLevel.prevGoal) / (outLevel.nextGoal - outLevel.prevGoal)) * 100));
                const inProgress = inLevel.maxed ? 100 : Math.min(100, Math.max(5, ((listenHours - inLevel.prevGoal) / (inLevel.nextGoal - inLevel.prevGoal)) * 100));
                return (
                    <View style={styles.compactLevelsWrap}>
                        <View style={styles.compactLevelBar}>
                            <View style={styles.compactLevelBarHead}>
                                <Text style={styles.compactLevelBarLabel}>🗣️ Out the Mouth</Text>
                                <View style={[styles.compactLevelBadge, { backgroundColor: SOUP_COLORS.pink }]}>
                                    <Text style={styles.compactLevelBadgeText}>Lv.{outLevel.level}</Text>
                                </View>
                            </View>
                            <View style={styles.compactBarTrack}>
                                <View style={[styles.compactBarFill, { width: `${outProgress}%`, backgroundColor: SOUP_COLORS.pink }]} />
                            </View>
                        </View>
                        <View style={styles.compactLevelBar}>
                            <View style={styles.compactLevelBarHead}>
                                <Text style={styles.compactLevelBarLabel}>🧠 In the Brain</Text>
                                <View style={[styles.compactLevelBadge, { backgroundColor: SOUP_COLORS.blue }]}>
                                    <Text style={styles.compactLevelBadgeText}>Lv.{inLevel.level}</Text>
                                </View>
                            </View>
                            <View style={styles.compactBarTrack}>
                                <View style={[styles.compactBarFill, { width: `${inProgress}%`, backgroundColor: SOUP_COLORS.blue }]} />
                            </View>
                        </View>
                    </View>
                );
            })()}

            {/* Mode strip: clear view for posting (public = ok to screen record, private = only in app) */}
            {!editing && (
                <View style={[styles.modeStrip, sharePreference === 'public' ? styles.modeStripPublic : styles.modeStripPrivate]}>
                    <Text style={[styles.modeStripLabel, sharePreference === 'public' && styles.modeStripLabelPublic]}>
                        {sharePreference === 'public' ? 'public' : 'private'}
                    </Text>
                    <Text style={styles.modeStripHint}>
                        {sharePreference === 'public' ? 'ok to screen record, share on Instagram' : 'only in app'}
                    </Text>
                </View>
            )}

            {/* Bio: show when view, editable when edit */}
            {editing ? (
                <>
                    <Text style={styles.inlineEditLabel}>bio</Text>
                    <TextInput
                        style={styles.bioInputInline}
                        value={newBio}
                        onChangeText={setNewBio}
                        placeholder="a bit about you..."
                        placeholderTextColor={SOUP_COLORS.subtext}
                        multiline
                        numberOfLines={3}
                    />
                </>
            ) : (
                (user?.bio?.trim() ? (
                    <View style={styles.bioBlock}>
                        <Text style={styles.inlineEditLabel}>bio</Text>
                        <Text style={styles.bioTextInline}>{user.bio}</Text>
                    </View>
                ) : null)
            )}

            {/* Profile visibility (public/private) - visible in view mode */}
            {!editing && (
                <Pressable style={styles.visibilityRow} onPress={() => setEditing(true)}>
                    <Text style={styles.inlineEditLabel}>profile visibility</Text>
                    <Text style={styles.visibilityValue}>
                        {sharePreference === 'public'
                            ? 'Public (ok to feature on Instagram)'
                            : 'Private (only in app)'}
                    </Text>
                    <Text style={styles.visibilityHint}>
                        Private = only in app. Public = ok to feature on Instagram. Default is private.
                    </Text>
                </Pressable>
            )}

            {/* Inline edit: timezone, languages, share, save/cancel */}
            {editing && (
                <>
                    <Text style={styles.inlineEditLabel}>timezone</Text>
                    <View style={styles.inlineChipsRow}>
                        {newTimezone ? (
                            <Pressable style={[styles.languageChip, styles.languageChipSelected]} onPress={() => setNewTimezone('')}>
                                <Text style={[styles.languageChipText, styles.languageChipTextSelected]}>{newTimezone} ✕</Text>
                            </Pressable>
                        ) : null}
                        <TextInput
                            style={styles.inlineSearchInput}
                            value={timezoneSearch}
                            onChangeText={setTimezoneSearch}
                            placeholder="search timezone..."
                            placeholderTextColor={SOUP_COLORS.subtext}
                        />
                    </View>
                    {timezoneSearch ? (
                        <View style={styles.languageChips}>
                            {availableTimezones.filter(tz => tz.toLowerCase().includes(timezoneSearch.toLowerCase())).slice(0, 8).map(tz => (
                                <Pressable key={tz} style={styles.languageChip} onPress={() => { setNewTimezone(tz); setTimezoneSearch(''); }}>
                                    <Text style={styles.languageChipText}>{tz}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}

                    <Text style={styles.inlineEditLabel}>conversational languages</Text>
                    {newLanguages.length > 0 && (
                        <View style={[styles.languageChips, { marginBottom: 6 }]}>
                            {newLanguages.map(lang => (
                                <Pressable key={lang} style={[styles.languageChip, styles.languageChipSelected]} onPress={() => setNewLanguages(newLanguages.filter(l => l !== lang))}>
                                    <Text style={[styles.languageChipText, styles.languageChipTextSelected]}>{lang} ✕</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    <TextInput style={[styles.inlineSearchInput, { marginBottom: 8 }]} value={languageSearch} onChangeText={setLanguageSearch} placeholder="add language..." placeholderTextColor={SOUP_COLORS.subtext} />
                    {languageSearch ? (
                        <View style={styles.languageChips}>
                            {availableLanguages.filter(l => !newLanguages.includes(l) && l.toLowerCase().includes(languageSearch.toLowerCase())).slice(0, 12).map(lang => (
                                <Pressable key={lang} style={styles.languageChip} onPress={() => { setNewLanguages([...newLanguages, lang]); setLanguageSearch(''); }}>
                                    <Text style={styles.languageChipText}>{lang}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}

                    <Text style={styles.inlineEditLabel}>learning</Text>
                    {newLearning.length > 0 && (
                        <View style={[styles.languageChips, { marginBottom: 6 }]}>
                            {newLearning.map(lang => (
                                <Pressable key={lang} style={[styles.languageChip, styles.languageChipSelected]} onPress={() => setNewLearning(newLearning.filter(l => l !== lang))}>
                                    <Text style={[styles.languageChipText, styles.languageChipTextSelected]}>{lang} ✕</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    <TextInput style={[styles.inlineSearchInput, { marginBottom: 8 }]} value={learningSearch} onChangeText={setLearningSearch} placeholder="add language..." placeholderTextColor={SOUP_COLORS.subtext} />
                    {learningSearch ? (
                        <View style={styles.languageChips}>
                            {availableLanguages.filter(l => !newLearning.includes(l) && l.toLowerCase().includes(learningSearch.toLowerCase())).slice(0, 12).map(lang => (
                                <Pressable key={lang} style={styles.languageChip} onPress={() => { setNewLearning([...newLearning, lang]); setLearningSearch(''); }}>
                                    <Text style={styles.languageChipText}>{lang}</Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}

                    <Text style={styles.inlineEditLabel}>profile visibility</Text>
                    <Text style={styles.visibilityHint}>Private = only in app. Public = ok to feature on Instagram.</Text>
                    <View style={styles.shareRow}>
                        <Pressable onPress={() => setSharePreference('private')} style={[styles.shareOption, sharePreference === 'private' && styles.shareOptionSelected]}>
                            <Text style={[styles.shareOptionText, sharePreference === 'private' && styles.shareOptionTextSelected]}>Private</Text>
                        </Pressable>
                        <Pressable onPress={() => setSharePreference('public')} style={[styles.shareOption, sharePreference === 'public' && styles.shareOptionSelected]}>
                            <Text style={[styles.shareOptionText, sharePreference === 'public' && styles.shareOptionTextSelected]}>Public</Text>
                        </Pressable>
                    </View>

                    <View style={styles.inlineEditActions}>
                        <Pressable style={({ pressed }) => [styles.inlineCancelBtn, pressed && { opacity: 0.8 }]} onPress={() => { setEditing(false); setNewName(user?.display_name); setNewTagline(user?.status_text || ''); setNewBio(user?.bio || ''); setNewTimezone(user?.timezone || ''); setNewLanguages(user?.fluent_languages || []); setNewLearning(user?.learning_languages || []); setSharePreference(user?.share_preference === 'public' ? 'public' : 'private'); setLanguageSearch(''); setLearningSearch(''); setTimezoneSearch(''); }}>
                            <Text style={styles.inlineCancelText}>cancel</Text>
                        </Pressable>
                        <Pressable style={({ pressed }) => [styles.inlineSaveBtn, pressed && { opacity: 0.9 }]} onPress={handleSave}>
                            <Text style={styles.inlineSaveText}>save</Text>
                        </Pressable>
                    </View>
                </>
            )}
            </View>
        </View>
    );

    // Helper to get left side positions (learning languages)
    const getLeftFlagPosition = (index) => {
        const baseTop = 85;
        const spacing = 40;
        return {
            top: baseTop + (index * spacing),
            left: -80,
        };
    };

    // Helper to get right side positions (fluent languages)
    const getRightFlagPosition = (index) => {
        const baseTop = 85;
        const spacing = 40;
        return {
            top: baseTop + (index * spacing),
            right: -80,
        };
    };

    // Helper function to get flag emoji from language name
    const getLanguageFlag = (language) => {
        if (!language) return '🌍';

        // Extract base language name (before / or parentheses)
        const baseLang = language.split('/')[0].split('(')[0].trim().toLowerCase();

        const flags = {
            'spanish': '🇪🇸',
            'french': '🇫🇷',
            'italian': '🇮🇹',
            'german': '🇩🇪',
            'portuguese': '🇵🇹',
            'english': '🇬🇧',
            'chinese': '🇨🇳',
            'japanese': '🇯🇵',
            'korean': '🇰🇷',
            'arabic': '🇸🇦',
            'russian': '🇷🇺',
            'hindi': '🇮🇳',
            'dutch': '🇳🇱',
            'swedish': '🇸🇪',
            'norwegian': '🇳🇴',
            'danish': '🇩🇰',
            'finnish': '🇫🇮',
            'polish': '🇵🇱',
            'turkish': '🇹🇷',
            'greek': '🇬🇷',
            'hebrew': '🇮🇱',
            'thai': '🇹🇭',
            'vietnamese': '🇻🇳',
            'indonesian': '🇮🇩',
            'malay': '🇲🇾',
            'tagalog': '🇵🇭',
            'swahili': '🇰🇪',
            'ukrainian': '🇺🇦',
            'czech': '🇨🇿',
            'romanian': '🇷🇴',
            'hungarian': '🇭🇺',
            'bulgarian': '🇧🇬',
            'croatian': '🇭🇷',
            'serbian': '🇷🇸',
        };

        return flags[baseLang] || '🌍';
    };

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

    const renderStats = () => {
        return (
            <View style={styles.statsSection}>
                <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionTitleAccent} />
                    <Text style={styles.profileSectionTitle}>stats</Text>
                </View>
                <View style={styles.statsCard}>
                {/* Compact Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statGridItem}>
                        <Text style={styles.statGridNumber}>
                            {Math.floor((stats?.total_speaking_seconds || 0) / 20)}
                        </Text>
                        <Text style={styles.statGridLabel}>Messages</Text>
                    </View>
                    <View style={styles.statGridDivider} />
                    <View style={styles.statGridItem}>
                        <Text style={styles.statGridNumber}>{groups.length}</Text>
                        <Text style={styles.statGridLabel}>Groups</Text>
                    </View>
                    <View style={styles.statGridDivider} />
                    <View style={styles.statGridItem}>
                        <Text style={styles.statGridNumber}>
                            {stats?.days_active || 0}
                        </Text>
                        <Text style={styles.statGridLabel}>Days</Text>
                    </View>
                </View>

                </View>
            </View>
        );
    };

    // Groups Section
    const renderGroups = () => {
        console.log('🔍 renderGroups called, groups count:', groups.length);
        if (groups.length === 0) return null;

        return (
            <View style={styles.groupsSection}>
                <Text style={styles.groupsSectionTitle}>Your Groups ({groups.length})</Text>
                {groups.map((group) => {
                    console.log('🎯 Rendering group:', group.name, 'language:', group.language);
                    return (
                        <Pressable
                            key={group.id}
                            style={styles.groupItem}
                            onPress={() => router.push(`/chat/${group.id}`)}
                        >
                            <GroupAvatar language={group.language} size={50} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.groupName}>{group.name}</Text>
                                <Text style={styles.groupMeta}>{group.member_count} members</Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={{ flex: 1 }} />
                {/* Right: Edit profile + Bell */}
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                    <Pressable onPress={() => setEditing(true)} hitSlop={10} style={({ pressed }) => pressed && { opacity: 0.8 }}>
                        <Edit2 size={22} color={SOUP_COLORS.blue} />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            if (permissionStatus !== 'granted') {
                                Alert.alert(
                                    'notifications off 🔕',
                                    'turn on notifications to never miss a challenge! 🍜',
                                    [
                                        { text: 'cancel', style: 'cancel' },
                                        { text: 'turn on ✨', onPress: openSettings }
                                    ]
                                );
                            } else {
                                Alert.alert('already on ✅', "they're already on. we'll ping you when soup is served. 🍜");
                            }
                        }}
                        style={styles.bellButton}
                    >
                        <Bell size={24} color={permissionStatus === 'granted' ? SOUP_COLORS.blue : SOUP_COLORS.pink} />
                        {permissionStatus !== 'granted' && (
                            <View style={styles.bellBadge} />
                        )}
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                onLayout={(e) => setScrollContentHeight(e.nativeEvent.layout.height)}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 24, minHeight: scrollContentHeight }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Content */}

                {renderIdentity()}

                <Pressable
                    style={({ pressed }) => [
                        styles.whatsNewRow,
                        pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => setShowWhatsNewSheet(true)}
                >
                    <HelpCircle size={20} color={SOUP_COLORS.blue} />
                    <Text style={styles.whatsNewLabel}>where things are / what's new</Text>
                    <ChevronRight size={18} color={SOUP_COLORS.subtext} />
                </Pressable>

                {renderStats()}
                {renderGroups()}

                {/* Sign out at bottom */}
                <Pressable
                    style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.85 }]}
                    onPress={handleSignOut}
                >
                    <LogOut size={20} color={SOUP_COLORS.pink} />
                    <Text style={styles.signOutText}>sign out</Text>
                </Pressable>

                <View style={{ height: 24 }} />
            </ScrollView>

            <WhatsNewSheet visible={showWhatsNewSheet} onClose={() => setShowWhatsNewSheet(false)} />

            {/* Levels Info Modal */}
            <Modal
                visible={showLevelsInfo}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowLevelsInfo(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.levelsInfoCard}>
                        <Pressable
                            style={styles.closeButton}
                            onPress={() => setShowLevelsInfo(false)}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </Pressable>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                            <Text style={styles.levelsInfoTitle}>Understanding Your Levels 📊</Text>

                            <View style={styles.comprehensibleExplainer}>
                                <Text style={styles.comprehensibleTitle}>What is Comprehensible Input?</Text>
                                <Text style={styles.comprehensibleText}>
                                    Comprehensible input is language you can understand, even if you don't know every word. It's the foundation of language acquisition - you learn by listening and reading things just slightly above your level.
                                </Text>
                                <Text style={styles.comprehensibleText}>
                                    <Text style={{ fontWeight: '700' }}>Input</Text> (listening) builds your understanding. <Text style={{ fontWeight: '700' }}>Output</Text> (speaking) keeps you motivated and helps you practice what you've learned. Both matter! 🍜
                                </Text>
                            </View>

                            <View style={styles.levelTypeSection}>
                                <Text style={styles.levelTypeTitle}>👂 Input (Listening)</Text>
                                <Text style={styles.levelTypeDesc}>Estimated hours listening to others</Text>
                                <View style={styles.levelsList}>
                                    <Text style={styles.levelItem}>Lv.1 👂 Ear Training (0-3 hrs)</Text>
                                    <Text style={styles.levelItem}>Lv.2 🎣 Word Catcher (3-10 hrs)</Text>
                                    <Text style={styles.levelItem}>Lv.3 👑 Context King (10-30 hrs)</Text>
                                    <Text style={styles.levelItem}>Lv.4 🧠 Comprehension Pro (30-100 hrs)</Text>
                                    <Text style={styles.levelItem}>Lv.5 🚀 Native Speed (100-300 hrs)</Text>
                                    <Text style={styles.levelItem}>Lv.6 🌍 Polyglot (300+ hrs)</Text>
                                </View>
                            </View>

                            <View style={styles.levelTypeSection}>
                                <Text style={styles.levelTypeTitle}>🎤 Output (Speaking)</Text>
                                <Text style={styles.levelTypeDesc}>Measured in minutes of voice messages sent</Text>
                                <View style={styles.levelsList}>
                                    <Text style={styles.levelItem}>Lv.1 🌱 First Words (0-30 min)</Text>
                                    <Text style={styles.levelItem}>Lv.2 🧱 Sentence Builder (30-120 min)</Text>
                                    <Text style={styles.levelItem}>Lv.3 💬 Conversation Starter (120-300 min)</Text>
                                    <Text style={styles.levelItem}>Lv.4 🍜 Daily Souper (300-600 min)</Text>
                                    <Text style={styles.levelItem}>Lv.5 🎙️ Fluent Rambler (600-1200 min)</Text>
                                    <Text style={styles.levelItem}>Lv.6 🌟 Native Vibes (1200+ min)</Text>
                                </View>
                            </View>

                            <Text style={styles.levelsInfoFooter}>
                                Early levels = quick wins! Later levels = real mastery. You listen way more than you speak, just like real life! 🍜
                            </Text>
                        </ScrollView>

                        <Text style={styles.scrollPrompt}>👆 Scroll to see all levels</Text>
                    </View>
                </View>
            </Modal>

            {/* Avatar Picker Modal */}
            <Modal
                visible={showAvatarPicker}
                animationType="slide"
                presentationStyle="formSheet"
                onRequestClose={() => setShowAvatarPicker(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setShowAvatarPicker(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>Choose Avatar</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={styles.modalContent}>
                            <Text style={styles.sectionTitle}>Choose Your Avatar</Text>
                            <Text style={styles.sectionSubtitle}>Upload a photo or pick a soup</Text>

                            <View style={styles.soupGrid}>
                                <Pressable
                                    style={styles.soupOption}
                                    onPress={() => {
                                        setShowAvatarPicker(false);
                                        pickImage();
                                    }}
                                >
                                    <View style={styles.photoUploadIcon}>
                                        <Camera size={40} color={SOUP_COLORS.blue} />
                                    </View>
                                    <Text style={styles.soupName}>your photo</Text>
                                </Pressable>

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
                                                <ActivityIndicator color={SOUP_COLORS.blue} size="large" />
                                            </View>
                                        )}
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 14,
        backgroundColor: SOUP_COLORS.cream,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.06)',
        marginBottom: 12,
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        backgroundColor: SOUP_COLORS.cream,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        marginTop: -10,
    },
    signOutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginTop: 24,
        marginBottom: 8,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
    },
    whatsNewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: SOUP_COLORS.cardBg,
        borderRadius: 20,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(0, 173, 239, 0.12)',
    },
    whatsNewLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    // HERO SECTION — card on cream (Pinterest-style)
    heroSection: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 8,
        backgroundColor: SOUP_COLORS.cream,
    },
    heroCard: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: SOUP_COLORS.cardBg,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 173, 239, 0.12)',
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    heroPhotoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    flagColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    photoCenterContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagColumnTitle: {
        fontSize: 8,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.8,
        marginBottom: 8,
        textAlign: 'center',
        numberOfLines: 1,
        flexWrap: 'nowrap',
    },
    flagList: {
        alignItems: 'center',
        gap: 8,
    },
    flagEmoji: {
        fontSize: 32,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    bellButton: {
        position: 'relative',
        padding: 4,
    },
    bellBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: SOUP_COLORS.pink,
        borderWidth: 2,
        borderColor: SOUP_COLORS.cream,
    },
    expandButton: {
        fontSize: 11,
        fontWeight: '700',
        color: SOUP_COLORS.blue,
        marginTop: 4,
    },
    heroAvatarWrapper: {
        position: 'relative',
        marginBottom: 30,
    },
    heroAvatarContainer: {
        position: 'relative',
    },
    heroAvatar: {
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 4,
        borderColor: SOUP_COLORS.blue,
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    heroAvatarPlaceholder: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroAvatarInitial: {
        fontSize: 60,
        color: '#fff',
        fontWeight: '900',
    },
    heroEditBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: SOUP_COLORS.pink,
        padding: 10,
        borderRadius: 25,
        borderWidth: 3,
        borderColor: SOUP_COLORS.cream,
    },
    heroNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 8,
    },
    heroName: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        textAlign: 'center',
    },
    heroTagline: {
        fontSize: 15,
        color: SOUP_COLORS.text,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    taglinePill: {
        alignSelf: 'center',
        marginTop: 6,
        paddingLeft: 12,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
    },
    compactLevelsWrap: { width: '100%', marginTop: 16, marginBottom: 8 },
    compactLevelBar: { marginBottom: 12 },
    compactLevelBarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    compactLevelBarLabel: { fontSize: 13, fontWeight: '700', color: SOUP_COLORS.text },
    compactLevelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    compactLevelBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
    compactBarTrack: { height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' },
    compactBarFill: { height: '100%', borderRadius: 4 },
    visibilityRow: { width: '100%', marginTop: 16 },
    visibilityValue: { fontSize: 15, fontWeight: '700', color: SOUP_COLORS.text, marginBottom: 4 },
    visibilityHint: { fontSize: 13, color: SOUP_COLORS.subtext },
    modeStrip: {
        width: '100%',
        marginTop: 14,
        marginBottom: 4,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    modeStripPublic: {
        backgroundColor: 'rgba(25, 176, 145, 0.12)',
        borderColor: SOUP_COLORS.green,
    },
    modeStripPrivate: {
        backgroundColor: 'rgba(0,0,0,0.04)',
        borderColor: 'rgba(0,0,0,0.1)',
    },
    modeStripLabel: { fontSize: 14, fontWeight: '800', color: SOUP_COLORS.text, textTransform: 'lowercase', marginBottom: 2 },
    modeStripLabelPublic: { color: SOUP_COLORS.green },
    modeStripHint: { fontSize: 12, color: SOUP_COLORS.subtext },
    heroNameInput: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        textAlign: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        flex: 1,
    },
    heroTaglineInput: {
        fontSize: 15,
        color: SOUP_COLORS.text,
        textAlign: 'center',
        marginTop: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        marginBottom: 6,
    },
    inlineEditLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginTop: 14,
        marginBottom: 6,
    },
    bioInputInline: {
        fontSize: 15,
        color: SOUP_COLORS.text,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        minHeight: 72,
        textAlignVertical: 'top',
    },
    bioBlock: { marginTop: 8 },
    bioTextInline: { fontSize: 15, color: SOUP_COLORS.text, lineHeight: 22 },
    inlineChipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 },
    inlineSearchInput: {
        fontSize: 15,
        color: SOUP_COLORS.text,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        flex: 1,
        minWidth: 120,
    },
    inlineEditActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 24,
        marginBottom: 8,
    },
    inlineCancelBtn: { paddingVertical: 12, paddingHorizontal: 24 },
    inlineCancelText: { fontSize: 16, fontWeight: '700', color: SOUP_COLORS.subtext },
    inlineSaveBtn: { backgroundColor: SOUP_COLORS.blue, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 },
    inlineSaveText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    heroLanguagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    heroLangGroup: {
        flexDirection: 'row',
        gap: 6,
    },
    heroLangFlag: {
        fontSize: 28,
    },
    heroLangSeparator: {
        fontSize: 20,
        color: SOUP_COLORS.subtext,
        fontWeight: '300',
    },
    scatteredFlag: {
        position: 'absolute',
        fontSize: 36,
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    flagSection: {
        position: 'absolute',
    },
    flagSectionTitle: {
        position: 'absolute',
        fontSize: 9,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        opacity: 0.8,
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
        fontSize: 30,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -0.8,
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
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pillBlue: {
        backgroundColor: SOUP_COLORS.blue,
    },
    pillText: {
        fontSize: 13,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    bio: {
        fontSize: 16,
        color: SOUP_COLORS.text,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 20,
        marginHorizontal: 20,
        fontWeight: '500',
    },
    langRow: {
        flexDirection: 'column', // Changed to column to allow wrapping children properly
        alignItems: 'flex-start',
        gap: 8,
    },
    labelSmall: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontWeight: '600',
    },
    langChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: SOUP_COLORS.green,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
    },
    chipYellow: {
        backgroundColor: SOUP_COLORS.pink,
    },
    chipText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '800',
    },
    // STATS
    statsSection: {
        marginBottom: 24,
        paddingHorizontal: 0,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitleAccent: {
        width: 4,
        height: 20,
        borderRadius: 2,
        backgroundColor: SOUP_COLORS.blue,
        marginRight: 10,
    },
    profileSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    statsCard: {
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statGridItem: {
        flex: 1,
        alignItems: 'center',
    },
    statGridNumber: {
        fontSize: 32,
        fontWeight: '900',
        color: SOUP_COLORS.blue,
        marginBottom: 4,
    },
    statGridLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statGridDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 12,
    },
    bigStatCard: {
        backgroundColor: 'rgba(0, 173, 239, 0.12)',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 0,
    },
    bigStatLabel: {
        fontSize: 13,
        color: SOUP_COLORS.text,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 12,
    },
    bigStatNumber: {
        fontSize: 52,
        fontWeight: '900',
        color: SOUP_COLORS.blue,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingRight: 10,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        marginBottom: 4,
        marginLeft: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        marginBottom: 20,
        marginLeft: 4,
        maxWidth: '95%',
        lineHeight: 20,
        fontWeight: '500',
    },
    infoButton: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'rgba(0, 173, 239, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    infoButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
    },
    subSectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 10,
        marginLeft: 4,
        marginTop: 12,
    },
    emptyText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
        marginLeft: 4,
        marginBottom: 16,
    },
    metricRow: {
        marginBottom: 14,
    },
    metricHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    metricLang: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    metricVal: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    metricBarBg: {
        height: 10,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 5,
        overflow: 'hidden',
    },
    metricBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    outputBar: {
        backgroundColor: SOUP_COLORS.pink,
    },
    inputBar: {
        backgroundColor: SOUP_COLORS.blue,
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
        fontSize: 11,
        color: '#fff',
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        overflow: 'hidden',
    },
    levelName: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        marginBottom: 6,
    },
    progressText: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
        marginTop: 4,
        textAlign: 'right',
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
    // GROUPS SECTION
    groupsSection: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    groupsSectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 16,
    },
    groupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    groupMeta: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontWeight: '500',
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
    scrollPrompt: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        paddingVertical: 12,
        fontStyle: 'italic',
    },
    // Section Header Row with Info Button
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    infoButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    infoButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    // Levels Info Modal
    levelsInfoCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        maxWidth: '90%',
        maxHeight: '80%',
    },
    levelsInfoTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    comprehensibleExplainer: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#f0f9ff',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: SOUP_COLORS.blue,
    },
    comprehensibleTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 8,
    },
    comprehensibleText: {
        fontSize: 13,
        color: SOUP_COLORS.text,
        lineHeight: 20,
        marginBottom: 8,
    },
    levelsInfoSubtitle: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        marginBottom: 20,
        textAlign: 'center',
    },
    levelTypeSection: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 12,
    },
    levelTypeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    levelTypeDesc: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginBottom: 12,
    },
    levelsList: {
        gap: 6,
    },
    levelItem: {
        fontSize: 13,
        color: SOUP_COLORS.text,
        paddingLeft: 8,
    },
    levelsInfoFooter: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
    // Edit Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        backgroundColor: '#fff',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    modalCancel: {
        fontSize: 16,
        color: SOUP_COLORS.subtext,
    },
    modalSave: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    // ADMIN PROFILE ADDITIONS
    adminProfileSection: {
        marginBottom: 24,
        marginTop: 10,
    },
    adminSectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    adminCardRow: {
        flexDirection: 'row',
        gap: 12,
    },
    adminCardSmall: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    adminCardSmallTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    modalScroll: {
        flex: 1,
    },
    modalContent: {
        padding: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 8,
        marginTop: 16,
    },
    modalLabelRow: {
        marginTop: 20,
        marginBottom: 8,
    },
    modalShareHint: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 4,
        marginBottom: 10,
    },
    shareRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    shareOption: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    shareOptionSelected: {
        borderColor: SOUP_COLORS.blue,
        backgroundColor: SOUP_COLORS.blue + '15',
    },
    shareOptionText: {
        fontSize: 15,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    shareOptionTextSelected: {
        color: SOUP_COLORS.blue,
        fontWeight: '700',
    },
    modalInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    flavorScroll: {
        marginTop: 8,
        marginBottom: 16,
        flexGrow: 0,
    },
    flavorChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        marginRight: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    flavorChipSelected: {
        backgroundColor: SOUP_COLORS.pink,
        borderColor: SOUP_COLORS.pink,
        transform: [{ scale: 1.02 }],
    },
    flavorChipText: {
        fontSize: 13,
        color: SOUP_COLORS.text,
        fontWeight: '500',
    },
    flavorChipTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    modalTextArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalRow: {
        flexDirection: 'row',
    },
    languageChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    languageChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue,
    },
    languageChipSelected: {
        backgroundColor: SOUP_COLORS.blue,
    },
    languageChipTextSelected: {
        color: '#fff',
    },
    // NEW COMPREHENSIBLE STYLES
    comprehensibleCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
    },
    statsTabs: {
        flexDirection: 'row',
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
    },
    statsTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 14,
    },
    statsTabActive: {
        backgroundColor: '#fff',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    statsTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
    },
    statsTabTextActive: {
        color: SOUP_COLORS.text,
        fontWeight: '800',
    },
    emptyStateContainer: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyEmoji: {
        fontSize: 40,
        marginBottom: 8,
        opacity: 0.5,
    },
    statItemCard: {
        marginBottom: 24,
    },
    statHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    statLangName: {
        fontSize: 17,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    statLevelName: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    statLevelBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statLevelText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    cuteBarContainer: {
        height: 16,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 10,
        marginBottom: 8,
        overflow: 'visible', // Allow emoji to overflow
    },
    cuteBarFill: {
        height: '100%',
        borderRadius: 10,
        position: 'relative',
        minWidth: 16, // Ensure visible at 0%
    },
    travelingEmojiContainer: {
        position: 'absolute',
        right: -10, // Hang off the end
        top: -12,   // Float above
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    travelingEmoji: {
        fontSize: 20,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    statFooterText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        textAlign: 'right',
        fontStyle: 'italic',
    },
    // Avatar Picker Modal Styles
    photoPickerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: SOUP_COLORS.blue,
        borderStyle: 'dashed',
        marginBottom: 24,
    },
    photoPickerText: {
        fontSize: 16,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    dividerText: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
    },
    soupGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
    },
    soupOption: {
        width: '30%',
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
        borderColor: SOUP_COLORS.blue,
        backgroundColor: '#F0F9FF',
    },
    soupImage: {
        width: '80%',
        height: '70%',
        marginBottom: 8,
    },
    soupName: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        lineHeight: 14,
    },
    soupNameSelected: {
        color: SOUP_COLORS.blue,
    },
    avatarPhotoOption: {
        alignSelf: 'center',
        minWidth: 160,
        marginTop: 16,
    },
    photoUploadIcon: {
        width: '80%',
        height: '70%',
        marginBottom: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
    },
    soupSelectorButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: SOUP_COLORS.blue,
    },
    soupSelectorText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        textAlign: 'center',
    },
});
