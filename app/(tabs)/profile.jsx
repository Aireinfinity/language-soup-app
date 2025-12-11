import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Alert, Text, Switch, Modal, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, Edit2, LogOut, MapPin, Globe, Award, Share2, Sparkles, Flag, Clock, Crown, X, Download, ArrowRight, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { decode } from 'base64-arraybuffer';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const [newTagline, setNewTagline] = useState('');
    const [newTimezone, setNewTimezone] = useState('');
    const [newLanguages, setNewLanguages] = useState([]);
    const [newLearning, setNewLearning] = useState([]);
    const [availableLanguages, setAvailableLanguages] = useState([]);
    const [availableTimezones, setAvailableTimezones] = useState([]);
    const [languageSearch, setLanguageSearch] = useState('');
    const [learningSearch, setLearningSearch] = useState('');
    const [timezoneSearch, setTimezoneSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showWrappedModal, setShowWrappedModal] = useState(false);
    const [newSoupFlavor, setNewSoupFlavor] = useState('');
    const [statsTab, setStatsTab] = useState('input'); // 'input' | 'output'
    const [showLevelsInfo, setShowLevelsInfo] = useState(false);
    const wrappedRef = useRef();

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
                setNewTagline(userData.status_text || '');
                setNewTimezone(userData.timezone || '');
                setNewLanguages(userData.fluent_languages || []);
                setNewLearning(userData.learning_languages || []);
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

                // Comprehensive language list (100+ languages)
                // Comprehensive language list with dialects and regional variants
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

                // Simplified Timezones
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
            } const { data: statsData } = await supabase
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
            timezone: (newTimezone || '').trim(),
            fluent_languages: newLanguages || [],
            learning_languages: newLearning || []
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

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
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

            {/* Always show profile info, edit button opens modal */}
            {(
                <View style={styles.infoCenter}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{user?.display_name || 'Anonymous Souper'}</Text>
                        <Pressable onPress={() => setEditing(true)} hitSlop={10}>
                            <Edit2 size={18} color={SOUP_COLORS.blue} />
                        </Pressable>
                    </View>

                    {user.status_text ? <Text style={styles.bio}>"{user.status_text}"</Text> : null}

                    {/* Conversational Languages */}
                    {user.fluent_languages && user.fluent_languages.length > 0 && (
                        <View style={styles.langRow}>
                            <Text style={styles.labelSmall}>I speak conversationally:</Text>
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
                        <View style={[styles.langRow, { marginTop: 12 }]}>
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

    const renderStats = () => {
        // Calculate max for relative bar widths
        const outputData = stats?.flavor_breakdown || [];
        const maxOutput = Math.max(...outputData.map(l => l.seconds || 0), 1);

        // For input, we'll estimate based on messages received in each language group
        // This would need a separate RPC in production, for now we'll show the same data as a placeholder
        const inputData = stats?.listening_breakdown || stats?.flavor_breakdown || [];
        const maxInput = Math.max(...inputData.map(l => l.seconds || 0), 1);
        // OUTPUT (Speaking) levels - in MINUTES
        const getOutputLevel = (minutes) => {
            if (minutes < 30) return { level: 1, name: 'First Words 🌱', nextGoal: 30, prevGoal: 0, color: '#8BC34A' };
            if (minutes < 120) return { level: 2, name: 'Sentence Builder 🧱', nextGoal: 120, prevGoal: 30, color: '#4CAF50' };
            if (minutes < 300) return { level: 3, name: 'Conversation Starter 💬', nextGoal: 300, prevGoal: 120, color: '#00BCD4' };
            if (minutes < 600) return { level: 4, name: 'Daily Souper 🍜', nextGoal: 600, prevGoal: 300, color: '#FF9800' };
            if (minutes < 1200) return { level: 5, name: 'Fluent Rambler 🎙️', nextGoal: 1200, prevGoal: 600, color: '#E91E63' };
            return { level: 6, name: 'Native Vibes 🌟', nextGoal: 1200, prevGoal: 1200, color: '#9C27B0', maxed: true };
        };

        // INPUT (Listening) levels - in HOURS
        const getInputLevel = (hours) => {
            if (hours < 3) return { level: 1, name: 'Ear Training 👂', nextGoal: 3, prevGoal: 0, color: '#8BC34A' };
            if (hours < 10) return { level: 2, name: 'Word Catcher 🎣', nextGoal: 10, prevGoal: 3, color: '#4CAF50' };
            if (hours < 30) return { level: 3, name: 'Context King 👑', nextGoal: 30, prevGoal: 10, color: '#00BCD4' };
            if (hours < 100) return { level: 4, name: 'Comprehension Pro 🧠', nextGoal: 100, prevGoal: 30, color: '#FF9800' };
            if (hours < 300) return { level: 5, name: 'Native Speed 🚀', nextGoal: 300, prevGoal: 100, color: '#E91E63' };
            return { level: 6, name: 'Polyglot 🌍', nextGoal: 300, prevGoal: 300, color: '#9C27B0', maxed: true };
        };

        const InputIcon = () => <Text style={{ fontSize: 14 }}>🧠</Text>;
        const OutputIcon = () => <Text style={{ fontSize: 14 }}>🗣️</Text>;

        const renderMetricItem = (lang, levelInfo, type) => {
            const isInput = type === 'input';
            const progressPercent = levelInfo.maxed ? 100 :
                (((isInput ? (lang.seconds * 2 / 3600) : (lang.seconds / 60)) - levelInfo.prevGoal) / (levelInfo.nextGoal - levelInfo.prevGoal)) * 100;

            const clampedProgress = Math.min(Math.max(progressPercent, 5), 100);
            const barColor = isInput ? SOUP_COLORS.blue : SOUP_COLORS.pink;
            const emoji = isInput ? '🧠' : '🗣️';

            return (
                <View key={`${type}-${lang.language}`} style={styles.statItemCard}>
                    <View style={styles.statHeaderRow}>
                        <View>
                            <Text style={styles.statLangName}>{lang.language}</Text>
                            <Text style={styles.statLevelName}>{levelInfo.name}</Text>
                        </View>
                        <View style={[styles.statLevelBadge, { backgroundColor: barColor }]}>
                            <Text style={styles.statLevelText}>Lv.{levelInfo.level}</Text>
                        </View>
                    </View>

                    {/* Cute Progress Bar with Traveling Emoji */}
                    <View style={styles.cuteBarContainer}>
                        <View style={[styles.cuteBarFill, { width: `${clampedProgress}%`, backgroundColor: barColor }]}>
                            <View style={styles.travelingEmojiContainer}>
                                <Text style={styles.travelingEmoji}>{emoji}</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.statFooterText}>
                        {isInput
                            ? `${(lang.seconds * 2 / 3600).toFixed(1)} hours listened`
                            : `${Math.floor(lang.seconds / 60)} mins spoken`
                        }
                        {levelInfo.maxed ? ' (Maxed!)' : ` / ${levelInfo.nextGoal} to next level`}
                    </Text>
                </View>
            );
        };

        return (
            <View style={styles.statsSection}>
                <View style={styles.bigStatCard}>
                    <Text style={styles.bigStatLabel}>Total Voice Memos Sent</Text>
                    <Text style={styles.bigStatNumber}>
                        {Math.floor((stats?.total_speaking_seconds || 0) / 20)}
                    </Text>
                </View>

                {/* COMPREHENSIBLE Card */}
                <View style={styles.comprehensibleCard}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.sectionTitle}>Comprehensible 📖</Text>
                                <Pressable
                                    style={styles.infoButton}
                                    onPress={() => setShowLevelsInfo(true)}
                                >
                                    <Text style={styles.infoButtonText}>?</Text>
                                </Pressable>
                            </View>
                            <Text style={styles.sectionSubtitle}>Real progress, no streaks.</Text>
                        </View>
                    </View>

                    {/* TABS */}
                    <View style={styles.statsTabs}>
                        <Pressable
                            style={[styles.statsTab, statsTab === 'input' && styles.statsTabActive]}
                            onPress={() => setStatsTab('input')}
                        >
                            <Text style={[styles.statsTabText, statsTab === 'input' && styles.statsTabTextActive]}>
                                In the Brain 🧠
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.statsTab, statsTab === 'output' && styles.statsTabActive]}
                            onPress={() => setStatsTab('output')}
                        >
                            <Text style={[styles.statsTabText, statsTab === 'output' && styles.statsTabTextActive]}>
                                Out the Mouth 🗣️
                            </Text>
                        </Pressable>
                    </View>

                    {/* CONTENT */}
                    <View style={styles.statsContent}>
                        {statsTab === 'input' ? (
                            inputData.length === 0 ? (
                                <View style={styles.emptyStateContainer}>
                                    <Text style={styles.emptyEmoji}>👂</Text>
                                    <Text style={styles.emptyText}>Feed your brain! Listen to some memos.</Text>
                                </View>
                            ) : (
                                inputData.map((lang, idx) => {
                                    // Recalculate solely for render pass
                                    const listeningSeconds = (lang.seconds || 0) * 2;
                                    const hours = listeningSeconds / 3600;
                                    const levelInfo = getInputLevel(hours);
                                    return renderMetricItem(lang, levelInfo, 'input');
                                })
                            )
                        ) : (
                            outputData.length === 0 ? (
                                <View style={styles.emptyStateContainer}>
                                    <Text style={styles.emptyEmoji}>😶</Text>
                                    <Text style={styles.emptyText}>Cat got your tongue? Start yapping!</Text>
                                </View>
                            ) : (
                                outputData.map((lang, idx) => {
                                    const minutes = Math.floor((lang.seconds || 0) / 60);
                                    const levelInfo = getOutputLevel(minutes);
                                    return renderMetricItem(lang, levelInfo, 'output');
                                })
                            )
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const renderWrapped = () => {
        return (
            <Pressable onPress={() => setShowWrappedModal(true)}>
                <View style={styles.wrappedContainer}>
                    <LinearGradient
                        colors={[SOUP_COLORS.blue, '#9C27B0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.wrappedBanner}
                    >
                        {/* Decorative glow */}
                        <View style={[styles.wrappedGlow, { top: -20, right: -20, width: 80, height: 80, backgroundColor: 'rgba(255,255,255,0.2)' }]} />

                        <View style={styles.wrappedBannerContent}>
                            <View style={styles.wrappedIcon}>
                                <Text style={{ fontSize: 24 }}>🥣</Text>
                            </View>
                            <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <View style={styles.newBadge}>
                                        <Text style={styles.newBadgeText}>NEW</Text>
                                    </View>
                                    <Text style={styles.wrappedTitleSmall}>Your 2025 Wrapped</Text>
                                </View>
                                <Text style={styles.wrappedSubtitleSmall}>Tap to see your soup stats! ✨</Text>
                            </View>
                        </View>
                        <View style={styles.wrappedArrow}>
                            <ArrowRight color="#fff" size={24} />
                        </View>
                    </LinearGradient>
                </View>
            </Pressable>
        );
    };

    // Share functions
    const handleShareWrapped = async () => {
        try {
            const uri = await wrappedRef.current.capture();
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Share your Language Soup Wrapped!'
            });
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Failed to share. Please try again.');
        }
    };

    const handleSaveToPhotos = async () => {
        try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please allow access to save photos.');
                return;
            }

            const uri = await wrappedRef.current.capture();
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Saved!', 'Your Wrapped has been saved to your photos! 🎉');
            setShowWrappedModal(false);
        } catch (error) {
            console.error('Error saving:', error);
            Alert.alert('Error', 'Failed to save. Please try again.');
        }
    };

    // Full-screen Wrapped Modal
    const renderWrappedModal = () => {
        const totalMinutes = Math.floor((stats?.total_speaking_seconds || 0) / 60);
        const voiceMemoCount = Math.floor((stats?.total_speaking_seconds || 0) / 20);

        return (
            <Modal
                visible={showWrappedModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setShowWrappedModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={styles.closeButton}
                        onPress={() => setShowWrappedModal(false)}
                    >
                        <X size={28} color="#fff" />
                    </Pressable>

                    <ViewShot ref={wrappedRef} options={{ format: 'png', quality: 1 }}>
                        <LinearGradient
                            colors={['#0a0a1a', '#1a1a2e', '#16213e', '#0f3460']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.fullWrappedCard}
                        >
                            {/* Decorative glowing orbs */}
                            <View style={[styles.wrappedGlow, { top: -60, right: -60, backgroundColor: SOUP_COLORS.pink }]} />
                            <View style={[styles.wrappedGlow, { bottom: 100, left: -40, backgroundColor: SOUP_COLORS.blue, width: 100, height: 100 }]} />
                            <View style={[styles.wrappedGlow, { top: 200, right: -30, backgroundColor: SOUP_COLORS.green, width: 80, height: 80 }]} />

                            {/* Header with logo */}
                            <View style={styles.wrappedHeader}>
                                <Image
                                    source={require('../../assets/images/logo.png')}
                                    style={styles.wrappedLogoImg}
                                />
                                <View>
                                    <Text style={styles.wrappedBrandName}>LANGUAGE SOUP</Text>
                                    <Text style={styles.wrappedYear}>WRAPPED 2025</Text>
                                </View>
                            </View>

                            {/* User's name */}
                            <Text style={styles.wrappedUserName}>{user?.display_name || 'Souper Star'}</Text>
                            <Text style={styles.wrappedTagline}>{user?.status_text || 'Your year of slurping languages'}</Text>

                            {/* Big Hero Stat */}
                            <View style={styles.fullHeroStat}>
                                <Text style={styles.fullHeroNumber}>{totalMinutes}</Text>
                                <Text style={styles.heroLabel}>MINUTES OF SPEAKING PRACTICE</Text>
                            </View>

                            {/* Stats Grid */}
                            <View style={styles.fullTrackList}>
                                <View style={styles.trackRow}>
                                    <View style={[styles.trackIcon, { backgroundColor: SOUP_COLORS.pink }]}>
                                        <Text style={styles.trackEmoji}>🗣️</Text>
                                    </View>
                                    <View style={styles.trackInfo}>
                                        <Text style={styles.trackTitle}>Top Language</Text>
                                        <Text style={styles.trackSubtitle}>{stats?.monthly_top_language || 'None yet'}</Text>
                                    </View>
                                    <Text style={styles.trackStat}>{Math.floor((stats?.monthly_top_language_seconds || 0) / 60)}m</Text>
                                </View>

                                <View style={styles.trackRow}>
                                    <View style={[styles.trackIcon, { backgroundColor: SOUP_COLORS.blue }]}>
                                        <Text style={styles.trackEmoji}>🎙️</Text>
                                    </View>
                                    <View style={styles.trackInfo}>
                                        <Text style={styles.trackTitle}>Voice Memos</Text>
                                        <Text style={styles.trackSubtitle}>Total sent</Text>
                                    </View>
                                    <Text style={styles.trackStat}>{voiceMemoCount}</Text>
                                </View>

                                <View style={styles.trackRow}>
                                    <View style={[styles.trackIcon, { backgroundColor: SOUP_COLORS.green }]}>
                                        <Text style={styles.trackEmoji}>🔥</Text>
                                    </View>
                                    <View style={styles.trackInfo}>
                                        <Text style={styles.trackTitle}>Vibe Check</Text>
                                        <Text style={styles.trackSubtitle}>{stats?.consistency_label || 'New Souper'}</Text>
                                    </View>
                                    <Text style={styles.trackEmoji}>⚡</Text>
                                </View>
                            </View>

                            {/* Footer with branding */}
                            <View style={styles.wrappedFooterFull}>
                                <View style={styles.soupEmojis}>
                                    <Text style={styles.smallEmoji}>🍜</Text>
                                    <Text style={styles.smallEmoji}>🥢</Text>
                                    <Text style={styles.smallEmoji}>🌶️</Text>
                                    <Text style={styles.smallEmoji}>🍵</Text>
                                    <Text style={styles.smallEmoji}>🍜</Text>
                                </View>
                                <Text style={styles.wrappedHandle}>@languagesoup</Text>
                                <Text style={styles.wrappedSlogan}>slurp your way to fluency ✨</Text>
                            </View>
                        </LinearGradient>
                    </ViewShot>

                    <View style={styles.shareButtons}>
                        <Pressable style={styles.shareBtn} onPress={handleSaveToPhotos}>
                            <Download size={20} color="#fff" />
                            <Text style={styles.shareBtnText}>Save to Photos</Text>
                        </Pressable>
                        <Pressable style={styles.shareBtn} onPress={handleShareWrapped}>
                            <Share2 size={20} color="#fff" />
                            <Text style={styles.shareBtnText}>Share</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Content */}

                {renderIdentity()}
                {renderStats()}
                {renderWrapped()}
            </ScrollView>
            {renderWrappedModal()}

            {/* Edit Profile Modal */}
            <Modal
                visible={editing}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setEditing(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <Pressable onPress={handleSave}>
                            <Text style={styles.modalSave}>Save</Text>
                        </Pressable>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            style={styles.modalScroll}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.modalContent}>
                                <Text style={styles.modalLabel}>Name</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Your name"
                                    placeholderTextColor="#999"
                                />

                                <Text style={styles.modalLabel}>Tagline ✨</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    value={newTagline}
                                    onChangeText={setNewTagline}
                                    placeholder="your tagline..."
                                    placeholderTextColor="#999"
                                    maxLength={50}
                                />
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flavorScroll}>
                                    {EXAMPLE_TAGLINES.map(tag => (
                                        <Pressable
                                            key={tag}
                                            style={[styles.flavorChip, newTagline === tag && styles.flavorChipSelected]}
                                            onPress={() => setNewTagline(tag)}
                                        >
                                            <Text style={[styles.flavorChipText, newTagline === tag && styles.flavorChipTextSelected]}>
                                                {tag}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>

                                <Text style={styles.modalLabel}>Timezone 🌎</Text>
                                {/* Selected Timezone */}
                                {newTimezone ? (
                                    <View style={[styles.languageChips, { marginBottom: 8 }]}>
                                        <Pressable
                                            style={[styles.languageChip, styles.languageChipSelected]}
                                            onPress={() => setNewTimezone('')}
                                        >
                                            <Text style={[styles.languageChipText, styles.languageChipTextSelected]}>
                                                {newTimezone} ✕
                                            </Text>
                                        </Pressable>
                                    </View>
                                ) : null}

                                <TextInput
                                    style={[styles.modalInput, { marginBottom: 12 }]}
                                    value={timezoneSearch}
                                    onChangeText={setTimezoneSearch}
                                    placeholder="Search timezone..."
                                    placeholderTextColor="#999"
                                />
                                <View style={styles.languageChips}>
                                    {(() => {
                                        if (!timezoneSearch) return null;
                                        const filtered = availableTimezones.filter(tz =>
                                            tz.toLowerCase().includes(timezoneSearch.toLowerCase())
                                        );
                                        return (
                                            <>
                                                {filtered.slice(0, 10).map(tz => (
                                                    <Pressable
                                                        key={tz}
                                                        style={styles.languageChip}
                                                        onPress={() => {
                                                            setNewTimezone(tz);
                                                            setTimezoneSearch('');
                                                        }}
                                                    >
                                                        <Text style={styles.languageChipText}>{tz}</Text>
                                                    </Pressable>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </View>


                                <Text style={styles.modalLabel}>Conversational Languages</Text>
                                {/* Selected Languages always visible */}
                                {newLanguages.length > 0 && (
                                    <View style={[styles.languageChips, { marginBottom: 8 }]}>
                                        {newLanguages.map(lang => (
                                            <Pressable
                                                key={lang}
                                                style={[styles.languageChip, styles.languageChipSelected]}
                                                onPress={() => setNewLanguages(newLanguages.filter(l => l !== lang))}
                                            >
                                                <Text style={[styles.languageChipText, styles.languageChipTextSelected]}>
                                                    {lang} ✕
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}

                                <TextInput
                                    style={[styles.modalInput, { marginBottom: 12 }]}
                                    value={languageSearch}
                                    onChangeText={setLanguageSearch}
                                    placeholder="Start typing..."
                                    placeholderTextColor="#999"
                                />
                                <View style={styles.languageChips}>
                                    {(() => {
                                        // Filter out already selected ones from search results
                                        const filtered = availableLanguages.filter(lang =>
                                            !newLanguages.includes(lang) &&
                                            lang.toLowerCase().includes(languageSearch.toLowerCase())
                                        );
                                        // Only show search results if user is typing
                                        if (!languageSearch) return null;

                                        const toShow = filtered.slice(0, 20);

                                        return (
                                            <>
                                                {toShow.map(lang => (
                                                    <Pressable
                                                        key={lang}
                                                        style={styles.languageChip}
                                                        onPress={() => {
                                                            setNewLanguages([...newLanguages, lang]);
                                                            setLanguageSearch(''); // Clear search after adding
                                                        }}
                                                    >
                                                        <Text style={styles.languageChipText}>
                                                            {lang}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </View>

                                <Text style={styles.modalLabel}>Learning</Text>
                                {/* Selected Learning Languages always visible */}
                                {newLearning.length > 0 && (
                                    <View style={[styles.languageChips, { marginBottom: 8 }]}>
                                        {newLearning.map(lang => (
                                            <Pressable
                                                key={lang}
                                                style={[styles.languageChip, styles.languageChipSelected]}
                                                onPress={() => setNewLearning(newLearning.filter(l => l !== lang))}
                                            >
                                                <Text style={[styles.languageChipText, styles.languageChipTextSelected]}>
                                                    {lang} ✕
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}

                                <TextInput
                                    style={[styles.modalInput, { marginBottom: 12 }]}
                                    value={learningSearch}
                                    onChangeText={setLearningSearch}
                                    placeholder="Start typing..."
                                    placeholderTextColor="#999"
                                />
                                <View style={styles.languageChips}>
                                    {(() => {
                                        // Filter out already selected ones from search results
                                        const filtered = availableLanguages.filter(lang =>
                                            !newLearning.includes(lang) &&
                                            lang.toLowerCase().includes(learningSearch.toLowerCase())
                                        );
                                        // Only show search results if user is typing
                                        if (!learningSearch) return null;

                                        const toShow = filtered.slice(0, 20);

                                        return (
                                            <>
                                                {toShow.map(lang => (
                                                    <Pressable
                                                        key={lang}
                                                        style={styles.languageChip}
                                                        onPress={() => {
                                                            setNewLearning([...newLearning, lang]);
                                                            setLearningSearch(''); // Clear search after adding
                                                        }}
                                                    >
                                                        <Text style={styles.languageChipText}>
                                                            {lang}
                                                        </Text>
                                                    </Pressable>
                                                ))}
                                            </>
                                        );
                                    })()}
                                </View>

                                <View style={{ height: 100 }} />
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>

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
        backgroundColor: SOUP_COLORS.cream, // Cream header
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
        backgroundColor: SOUP_COLORS.cream,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        marginTop: -10,
        paddingBottom: 150,
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
        flexWrap: 'wrap', // Allow chips to wrap to next line
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
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingRight: 10,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 2,
        marginLeft: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        marginBottom: 16,
        marginLeft: 4,
        maxWidth: '95%',
        lineHeight: 18,
    },
    infoButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    infoButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: SOUP_COLORS.subtext,
    },
    subSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 8,
        marginLeft: 4,
        marginTop: 8,
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
    // WRAPPED - Button Banner Style
    wrappedContainer: {
        marginTop: 24,
        marginBottom: 40,
        marginHorizontal: 4,
    },
    wrappedBanner: {
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    newBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newBadgeText: {
        color: SOUP_COLORS.blue,
        fontSize: 10,
        fontWeight: '900',
    },
    wrappedArrow: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    wrappedBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    wrappedIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    wrappedTitleSmall: {
        fontSize: 16,
        fontWeight: '800',
        color: '#fff',
    },
    wrappedSubtitleSmall: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
    },
    // Old styles kept for modal
    wrappedCard: {
        borderRadius: 24,
        padding: 24,
        minHeight: 280,
    },
    wrappedTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: -1,
    },
    wrappedSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
        marginBottom: 16,
    },
    wrappedGlow: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: SOUP_COLORS.pink,
        opacity: 0.15,
    },
    heroStat: {
        alignItems: 'center',
        marginVertical: 20,
    },
    heroNumber: {
        fontSize: 64,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -2,
    },
    heroLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
        marginTop: -4,
    },
    trackList: {
        gap: 16,
        marginBottom: 24,
    },
    trackRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trackIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackEmoji: {
        fontSize: 18,
    },
    trackInfo: {
        flex: 1,
        marginLeft: 12,
    },
    trackTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    trackSubtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
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
    // Full-screen Wrapped Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 24,
        color: SOUP_COLORS.text,
        fontWeight: '400',
    },
    scrollContent: {
        flex: 1,
    },
    scrollPrompt: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        paddingVertical: 12,
        fontStyle: 'italic',
    },
    fullWrappedCard: {
        width: SCREEN_WIDTH - 40,
        borderRadius: 24,
        padding: 32,
        overflow: 'hidden',
    },
    fullWrappedTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: -1,
    },
    fullHeroStat: {
        alignItems: 'center',
        marginVertical: 32,
    },
    fullHeroNumber: {
        fontSize: 80,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -3,
    },
    fullTrackList: {
        gap: 20,
        marginBottom: 32,
    },
    shareButtons: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 24,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    shareBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    // Heavy branding styles
    wrappedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    wrappedLogo: {
        fontSize: 48,
    },
    wrappedLogoImg: {
        width: 50,
        height: 50,
        borderRadius: 12,
    },
    wrappedBrandName: {
        fontSize: 16,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 3,
    },
    wrappedYear: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.pink,
        letterSpacing: 2,
    },
    wrappedUserName: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        marginBottom: 4,
    },
    wrappedTagline: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        fontStyle: 'italic',
        marginBottom: 16,
    },
    wrappedFooterFull: {
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 20,
        marginTop: 8,
    },
    soupEmojis: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    smallEmoji: {
        fontSize: 20,
    },
    wrappedHandle: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.blue,
        letterSpacing: 1,
    },
    wrappedSlogan: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
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
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
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
});
