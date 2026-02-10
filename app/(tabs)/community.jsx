import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Pressable, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Users, ChevronRight, Play, Pause, Target, Globe, PlusCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Audio } from 'expo-av';
import WelcomeMissionModal from '../../components/WelcomeMissionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserPreviewModal } from '../../components/UserPreviewModal';
import { useQuests } from '../../contexts/QuestContext';
import ContextualTooltip from '../../components/ContextualTooltip';
import { getLanguageFlag } from '../../utils/languageFlags';
import { getAvatarSource } from '../../utils/soupUtils';

// Brand Colors
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    card: '#ffffff',
    red: '#FF3B30',
    yellow: '#FFCC00',
};

export default function CommunityScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState([]);
    const [activeGroups, setActiveGroups] = useState([]);
    const [memberCount, setMemberCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expandedAnnouncements, setExpandedAnnouncements] = useState({});
    const [knownIssues, setKnownIssues] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeUsers, setActiveUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [sortMode, setSortMode] = useState('all');
    const { completeQuest } = useQuests();

    // Global Welcome Logic
    const [globalWelcomes, setGlobalWelcomes] = useState([]);
    const [isPlayingGlobal, setIsPlayingGlobal] = useState(false);
    const [activeGlobalUri, setActiveGlobalUri] = useState(null);
    const [globalSound, setGlobalSound] = useState(null);
    const [showWelcomeMission, setShowWelcomeMission] = useState(false);
    const [myGroups, setMyGroups] = useState([]);

    useFocusEffect(
        React.useCallback(() => {
            loadData();
            loadActiveUsers();
            loadGlobalWelcomes();
            loadMyGroups();
        }, [])
    );

    useEffect(() => {
        // Realtime updates for announcements and tickets
        const channel = supabase
            .channel('community-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_community_announcements' }, loadData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_support_messages' }, loadData)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_messages', filter: "challenge_id=eq.global-welcome" }, loadGlobalWelcomes)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            if (globalSound) {
                globalSound.unloadAsync();
            }
        };
    }, [globalSound]);

    const loadData = async () => {
        try {
            // Load announcements
            const { data: announcementData } = await supabase
                .from('app_community_announcements')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false })
                .limit(5);
            setAnnouncements(announcementData || []);

            // Load Known Issues
            const { data: issuesData } = await supabase
                .from('app_support_messages')
                .select('id, title, priority, category, status')
                .eq('public_visible', true)
                // Showing all statuses including fixed to show progress
                .order('created_at', { ascending: false })
                .limit(10);

            // Actually, let's show all open public issues but maybe limit if too many.
            setKnownIssues(issuesData || []);

            // Load active groups (by member count)
            const { data: groupData } = await supabase
                .from('app_groups')
                .select('*')
                .order('member_count', { ascending: false })
                .limit(6);
            setActiveGroups(groupData || []);

            // Get total member count (excluding bots, test profiles, blank names)
            const { count } = await supabase
                .from('app_users')
                .select('*', { count: 'exact', head: true })
                .not('display_name', 'is', null)
                .neq('display_name', '')
                .not('display_name', 'ilike', '%test%')
                .not('display_name', 'ilike', '%NOAA%')
                .not('display_name', 'ilike', '%bot%');
            setMemberCount(count || 0);

        } catch (error) {
            console.error('Error loading community data:', error);
        } finally {
            setLoading(false);

            // Complete quest for peeking at active groups
            if (activeGroups.length > 0) {
                completeQuest('peek_active_groups');
            }
        }
    };

    const loadGlobalWelcomes = async () => {
        try {
            const { data } = await supabase
                .from('app_messages')
                .select('*, sender:app_users(display_name, avatar_url)')
                .eq('challenge_id', 'global-welcome')
                .order('created_at', { ascending: false })
                .limit(20);

            // Filter to unique senders for the gallery
            const unique = [];
            const seen = new Set();
            data?.forEach(msg => {
                if (!seen.has(msg.sender_id)) {
                    seen.add(msg.sender_id);
                    unique.push(msg);
                }
            });

            setGlobalWelcomes(unique);
        } catch (e) {
            console.error('Error loading global welcomes:', e);
        }
    };

    const loadMyGroups = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('app_group_members')
            .select('group_id, app_groups(id, name)')
            .eq('user_id', user.id);

        setMyGroups(data?.map(m => m.app_groups) || []);
    };

    const playGlobalGreeting = async (uri) => {
        try {
            if (globalSound) {
                await globalSound.unloadAsync();
                setGlobalSound(null);
            }

            if (activeGlobalUri === uri && isPlayingGlobal) {
                setIsPlayingGlobal(false);
                return;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true }
            );

            setGlobalSound(sound);
            setActiveGlobalUri(uri);
            setIsPlayingGlobal(true);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.didJustFinish) {
                    setIsPlayingGlobal(false);
                    setActiveGlobalUri(null);
                }
            });
        } catch (e) {
            console.error('Error playing greeting:', e);
        }
    };

    const loadActiveUsers = async () => {
        try {
            // Fetch a much larger pool to show "everybody"
            const { data: usersData } = await supabase
                .from('app_users')
                .select('id, display_name, avatar_url, status_text, fluent_languages, learning_languages, created_at')
                .not('display_name', 'is', null)
                .order('created_at', { ascending: false })
                .limit(500);

            if (!usersData) return;

            // --- FILTER NOAH DUPLICATES ---
            // Only allow "Noah :)" and "Noah Android"
            // We'll filter based on display_name patterns
            const filteredUsers = usersData.filter(u => {
                const name = u.display_name?.toLowerCase() || '';
                if (name.includes('noah')) {
                    // Allowed Noahs
                    return name === 'noah :)' || name === 'noah android';
                }
                return true;
            });

            const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
            const now = new Date();

            // 0. New Chefs (Joined in last 72 hours) - The VIP tier
            const newChefs = filteredUsers.filter(u => {
                if (!u.created_at) return false;
                return (now - new Date(u.created_at)) < THREE_DAYS_MS;
            });

            const remaining = filteredUsers.filter(u => {
                if (!u.created_at) return true;
                return (now - new Date(u.created_at)) >= THREE_DAYS_MS;
            });

            // Helper to check if it's a "Real Photo"
            const isRealPhoto = (avatarUrl) => {
                if (!avatarUrl) return false;
                const url = avatarUrl.toLowerCase();
                return url.includes('.jpg') || url.includes('.jpeg') || url.includes('googleusercontent') || url.includes('fbsbx.com');
            };

            // 1. Split remaining into tiers
            const photos = remaining.filter(u => isRealPhoto(u.avatar_url));
            const soupAndAvatars = remaining.filter(u => u.avatar_url && !isRealPhoto(u.avatar_url));
            const rest = remaining.filter(u => !u.avatar_url);

            // Also split NEW CHEFS by photos vs avatars for maximum VIP priority
            const newChefsWithPhotos = newChefs.filter(u => isRealPhoto(u.avatar_url));
            const newChefsOthers = newChefs.filter(u => !isRealPhoto(u.avatar_url));

            // 2. Shuffle each tier individually for constant randomization
            const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

            // 3. Combine in priority order: 
            // New Chefs (Photos) -> New Chefs (Others) -> Photos -> Soup/Avatars -> Rest
            const finalSelection = [
                ...shuffle(newChefsWithPhotos),
                ...shuffle(newChefsOthers),
                ...shuffle(photos),
                ...shuffle(soupAndAvatars),
                ...shuffle(rest)
            ];

            setActiveUsers(finalSelection);
        } catch (error) {
            console.error('Error loading active users:', error);
        }
    };



    const renderIssue = ({ item }) => (
        <View style={styles.issueCard}>
            <View style={[styles.issueBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                <Text style={styles.issueBadgeText}>{item.priority || 'Bug'}</Text>
            </View>
            <Text style={styles.issueTitle} numberOfLines={2}>{item.title || 'Untitled Issue'}</Text>
            <Text style={styles.issueStatus}>{item.status}</Text>
        </View>
    );

    const renderGroup = ({ item }) => (
        <Pressable
            style={styles.groupCard}
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.groupAvatar}>
                <Text style={styles.groupEmoji}>{item.emoji || '🥣'}</Text>
            </View>
            <Text style={styles.groupName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.memberRow}>
                <Users size={12} color={SOUP_COLORS.subtext} />
                <Text style={styles.memberText}>{item.member_count || 0}</Text>
            </View>

        </Pressable>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <Text style={styles.headerTitle}>Community Hub 🌍</Text>
                </View>
                {memberCount > 0 && (
                    <View style={styles.heroSection}>
                        <Text style={styles.heroNumber}>{memberCount}</Text>
                        <Text style={styles.heroLabel}>soupers worldwide</Text>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Global Welcome CTA & Gallery */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🌍 The Soup Greetings</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.galleryContainer}
                    >
                        {/* Recording CTA Card */}
                        <Pressable
                            style={styles.recordGreetingCard}
                            onPress={() => setShowWelcomeMission(true)}
                        >
                            <View style={styles.recordIconCircle}>
                                <PlusCircle size={28} color="#fff" />
                            </View>
                            <Text style={styles.recordText}>Say Hello!</Text>
                        </Pressable>

                        {/* Greetings Gallery */}
                        {globalWelcomes.map((item) => (
                            <Pressable
                                key={item.id}
                                style={styles.greetingItem}
                                onPress={() => playGlobalGreeting(item.media_url)}
                            >
                                <View style={styles.greetingAvatarContainer}>
                                    <Image
                                        source={getAvatarSource(item.sender?.avatar_url)}
                                        style={styles.greetingAvatar}
                                    />
                                    <View style={styles.playOverlay}>
                                        {(isPlayingGlobal && activeGlobalUri === item.media_url) ? (
                                            <Pause size={14} color="#fff" fill="#fff" />
                                        ) : (
                                            <Play size={14} color="#fff" fill="#fff" />
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.greetingName} numberOfLines={1}>
                                    {item.sender?.display_name?.split(' ')[0]}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* The Soup Pot - Iconic Design */}
                {activeUsers.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🍜 The Soup</Text>

                        {/* Sort/Filter Pills */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterContainer}
                        >
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'az', label: 'A-Z' },
                                { key: 'photo', label: '📸 Photo' },
                                { key: 'avatar', label: '🍜 Soup Avatar' },
                            ].map(opt => (
                                <Pressable
                                    key={opt.key}
                                    style={[styles.filterChip, sortMode === opt.key && styles.filterChipActive]}
                                    onPress={() => setSortMode(sortMode === opt.key ? 'all' : opt.key)}
                                >
                                    <Text style={[styles.filterText, sortMode === opt.key && styles.filterTextActive]}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* People Cards - Asymmetrical Grid */}
                        <View style={styles.pinterestGrid}>
                            {(() => {
                                let filtered = [...activeUsers];
                                if (sortMode === 'az') filtered.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
                                if (sortMode === 'photo') filtered = filtered.filter(u => u.avatar_url && !u.avatar_url.startsWith('soup://'));
                                if (sortMode === 'avatar') filtered = filtered.filter(u => u.avatar_url?.startsWith('soup://'));
                                return filtered.map((person, index) => (
                                    <Pressable
                                        key={person.id}
                                        style={styles.pinterestCard}
                                        onPress={() => setSelectedUser(person)}
                                    >
                                        {person.avatar_url && (
                                            <Image
                                                source={getAvatarSource(person.avatar_url)}
                                                style={[
                                                    styles.cardImage,
                                                    { height: index % 3 === 0 ? 180 : index % 3 === 1 ? 220 : 150 }
                                                ]}
                                            />
                                        )}
                                        {(() => {
                                            const isNew = person.created_at && (new Date() - new Date(person.created_at)) < (48 * 60 * 60 * 1000);
                                            if (isNew) {
                                                return (
                                                    <View style={styles.newBadgeDiagonal}>
                                                        <Text style={styles.newBadgeText}>NEW 🍲</Text>
                                                    </View>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <View style={styles.cardContent}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.cardName}>{person.display_name}</Text>
                                            </View>
                                            {person.status_text && (
                                                <Text style={styles.cardTagline} numberOfLines={3}>"{person.status_text}"</Text>
                                            )}
                                            <View style={styles.cardFlags}>
                                                {person.learning_languages?.slice(0, 5).map((lang, i) => (
                                                    <Text key={i} style={styles.cardFlag}>{getLanguageFlag(lang)}</Text>
                                                ))}
                                            </View>
                                        </View>
                                    </Pressable>
                                ));
                            })()}
                        </View>
                    </View>
                )}

                {/* Admin Announcements */}
                {announcements.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📣 Admin Announcements</Text>
                        {announcements.map(item => {
                            const isLong = item.content.length > 100;
                            const isExpanded = expandedAnnouncements[item.id];
                            const displayText = (isLong && !isExpanded)
                                ? item.content.substring(0, 100) + '...'
                                : item.content;

                            return (
                                <Pressable
                                    key={item.id}
                                    style={styles.fullAnnouncementCard}
                                    onPress={() => {
                                        if (isLong) {
                                            setExpandedAnnouncements(prev => ({
                                                ...prev,
                                                [item.id]: !prev[item.id]
                                            }));
                                        }
                                    }}
                                >
                                    <View style={styles.announcementIconLarge}>
                                        <Megaphone size={18} color="#fff" />
                                    </View>
                                    <View style={styles.announcementContent}>
                                        <Text style={styles.announcementFullText}>{displayText}</Text>
                                        {isLong && (
                                            <Text style={styles.readMoreText}>
                                                {isExpanded ? 'Show less' : 'Read more'}
                                            </Text>
                                        )}
                                        <Text style={styles.announcementDate}>
                                            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* User Preview Modal */}
            <UserPreviewModal
                visible={!!selectedUser}
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
            />

            <WelcomeMissionModal
                visible={showWelcomeMission}
                onClose={() => setShowWelcomeMission(false)}
                groups={myGroups}
            />
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
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        backgroundColor: SOUP_COLORS.blue,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    heroSection: {
        alignItems: 'center',
        marginTop: 8,
    },
    heroNumber: {
        fontSize: 52,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -2,
    },
    heroLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
        marginTop: -6,
    },
    scrollContent: {
        paddingBottom: 100,
    },

    // Chat Card
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    chatCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    chatIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    chatMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chatMetaText: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: SOUP_COLORS.red,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },

    // Sections
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        paddingHorizontal: 16,
        marginBottom: 12,
    },

    // Announcements
    announcementsList: {
        paddingHorizontal: 16,
    },
    announcementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        marginRight: 12,
        maxWidth: 280,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    announcementIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    announcementText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: SOUP_COLORS.text,
        lineHeight: 20,
    },

    // Groups
    groupsList: {
        paddingHorizontal: 16,
    },
    groupCard: {
        backgroundColor: '#fff',
        width: 110,
        padding: 14,
        borderRadius: 18,
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    groupAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: SOUP_COLORS.cream,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    groupEmoji: {
        fontSize: 26,
    },
    groupName: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        textAlign: 'center',
        marginBottom: 6,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },

    // Full Announcement Cards
    fullAnnouncementCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    announcementIconLarge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    announcementContent: {
        flex: 1,
    },
    announcementFullText: {
        fontSize: 15,
        fontWeight: '500',
        color: SOUP_COLORS.text,
        lineHeight: 22,
        marginBottom: 6,
    },
    announcementDate: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    readMoreText: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.blue,
        marginTop: 6,
        marginBottom: 4,
    },

    // Issue Cards
    issueCard: {
        backgroundColor: '#fff',
        width: 160,
        padding: 12,
        borderRadius: 16,
        marginRight: 12,
        justifyContent: 'space-between',
        height: 110,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    issueBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    issueBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    issueTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        lineHeight: 18,
        flex: 1,
    },
    issueStatus: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
        marginTop: 6,
        textTransform: 'capitalize',
    },

    // People Cards
    peopleList: {
        paddingHorizontal: 16,
    },
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    personAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 14,
    },
    personInfo: {
        flex: 1,
    },
    personName: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    personTagline: {
        fontSize: 14,
        fontStyle: 'italic',
        color: SOUP_COLORS.subtext,
        marginBottom: 6,
    },
    languageFlags: {
        flexDirection: 'row',
        gap: 4,
    },
    flagEmoji: {
        fontSize: 16,
    },
    dmButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: SOUP_COLORS.blue + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dmEmoji: {
        fontSize: 20,
    },

    // Language Filters
    filterContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.08)',
        minWidth: 40,
    },
    filterChipActive: {
        backgroundColor: SOUP_COLORS.blue,
        borderColor: SOUP_COLORS.blue,
    },
    filterEmoji: {
        fontSize: 18,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    filterTextActive: {
        color: '#fff',
    },

    // Pinterest Grid
    pinterestGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
    },
    pinterestCard: {
        width: '47%',
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#f0f0f0',
    },
    cardContent: {
        padding: 12,
    },
    cardName: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    newBadgeDiagonal: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: SOUP_COLORS.red,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderBottomRightRadius: 16,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    newBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    cardTagline: {
        fontSize: 13,
        fontStyle: 'italic',
        color: SOUP_COLORS.subtext,
        lineHeight: 18,
        marginBottom: 8,
    },
    cardFlags: {
        flexDirection: 'row',
        gap: 4,
        flexWrap: 'wrap',
    },
    cardFlag: {
        fontSize: 18,
    },

    // Gallery / Welcome Wall Styles
    galleryContainer: {
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 8,
        gap: 16,
    },
    recordGreetingCard: {
        width: 100,
        height: 120,
        backgroundColor: '#fff',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: SOUP_COLORS.pink,
        borderStyle: 'dashed',
        gap: 8,
    },
    recordIconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recordText: {
        fontSize: 12,
        fontWeight: '800',
        color: SOUP_COLORS.pink,
    },
    greetingItem: {
        width: 100,
        alignItems: 'center',
        gap: 8,
    },
    greetingAvatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        padding: 4,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    greetingAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 36,
    },
    playOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    greetingName: {
        fontSize: 12,
        fontWeight: '700',
        color: SOUP_COLORS.text,
    },
});

function getPriorityColor(p) {
    switch (p) {
        case 'P0': return SOUP_COLORS.red || '#FF3B30';
        case 'P1': return SOUP_COLORS.yellow || '#FFCC00';
        case 'P2': return SOUP_COLORS.green || '#19b091';
        default: return '#ccc';
    }
}
