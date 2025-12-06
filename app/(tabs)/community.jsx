import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Pressable, SafeAreaView, Platform, ScrollView } from 'react-native';
import { Megaphone, Calendar, ChevronRight, Flame, Users, BookOpen } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

// Brand Colors
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    card: '#ffffff',
    warning: '#ff9f43'
};

// Mock Data for "Social Proof"
const MOCK_ACTIVITY = {
    'Spanish Soup': { chefs: 12, live: true },
    'French Soup': { chefs: 5, live: false },
    'German Soup': { chefs: 8, live: true },
};

// Mock Announcements
const ANNOUNCEMENTS = [
    {
        id: '1',
        title: 'Welcome to Language Soup! 🥣',
        date: 'Dec 4',
        tag: 'Update'
    },
    {
        id: '2',
        title: 'New Feature: Spotify-Style Wrapped 📼',
        date: 'Dec 5',
        tag: 'Feature'
    }
];

export default function CommunityScreen() {
    const router = useRouter();
    const [groups, setGroups] = useState([]);
    const [todaysChallenge, setTodaysChallenge] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch Groups
            const { data: groupsData } = await supabase
                .from('app_groups')
                .select('*')
                .order('name');
            setGroups(groupsData || []);

            // Fetch Latest Challenge (Daily Special)
            const { data: challengeData } = await supabase
                .from('app_challenges')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            setTodaysChallenge(challengeData);

        } catch (error) {
            console.error('Error fetching community data:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderDailySpecial = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>The Daily Special 🥗</Text>
                <Text style={styles.sectionSubtitle}>Get cooking!</Text>
            </View>

            <View style={styles.specialCard}>
                <LinearGradient
                    colors={[SOUP_COLORS.blue, '#0097cf']}
                    style={styles.specialGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.specialBadge}>
                        <Flame size={14} color="#fff" />
                        <Text style={styles.specialBadgeText}>HOT & FRESH</Text>
                    </View>

                    <Text style={styles.specialPrompt}>
                        {todaysChallenge ? todaysChallenge.prompt_text : "Loading today's recipe..."}
                    </Text>

                    <Pressable style={styles.specialBtn}>
                        <Text style={styles.specialBtnText}>View Prompt</Text>
                        <ChevronRight size={16} color={SOUP_COLORS.blue} />
                    </Pressable>
                </LinearGradient>
            </View>
        </View>
    );

    const renderActiveGroups = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bustling Kitchens 🥘</Text>
                <Text style={styles.sectionSubtitle}>Jump in where the vibes are.</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupsScroll}>
                {groups.map((group) => {
                    const activity = MOCK_ACTIVITY[group.name] || { chefs: Math.floor(Math.random() * 10) + 1, live: Math.random() > 0.7 };

                    return (
                        <Pressable
                            key={group.id}
                            style={styles.groupCard}
                            onPress={() => router.push(`/chat/${group.id}`)}
                        >
                            <View style={styles.groupHeader}>
                                {group.image_url ? (
                                    <Image source={{ uri: group.image_url }} style={styles.groupImage} />
                                ) : (
                                    <View style={styles.groupPlaceholder}>
                                        <Text style={styles.groupEmoji}>{group.emoji || '🥣'}</Text>
                                    </View>
                                )}
                                {activity.live && (
                                    <View style={styles.liveIndicator}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>LIVE</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>

                            <View style={styles.activityRow}>
                                <Users size={12} color={SOUP_COLORS.subtext} />
                                <Text style={styles.activityText}>
                                    <Text style={{ fontWeight: '700', color: SOUP_COLORS.green }}>{activity.chefs}</Text> chefs cooking
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );

    const renderNews = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Community News 📰</Text>
            </View>

            {ANNOUNCEMENTS.map((item) => (
                <View key={item.id} style={styles.newsCard}>
                    <View style={styles.newsIcon}>
                        <Megaphone size={16} color="#fff" />
                    </View>
                    <View style={styles.newsContent}>
                        <Text style={styles.newsTitle}>{item.title}</Text>
                        <View style={styles.newsMeta}>
                            <Text style={styles.newsTag}>{item.tag}</Text>
                            <Text style={styles.newsDate}>• {item.date}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community Hub 🌍</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {renderDailySpecial()}
                {renderActiveGroups()}
                {renderNews()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    // Daily Special
    specialCard: {
        marginHorizontal: 24,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 4,
    },
    specialGradient: {
        padding: 24,
    },
    specialBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        marginBottom: 16,
    },
    specialBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    specialPrompt: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 20,
        lineHeight: 30,
    },
    specialBtn: {
        backgroundColor: '#fff',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 16,
        gap: 4,
    },
    specialBtnText: {
        color: SOUP_COLORS.blue,
        fontWeight: '700',
        fontSize: 14,
    },
    // Groups
    groupsScroll: {
        paddingHorizontal: 24,
        gap: 16,
    },
    groupCard: {
        backgroundColor: '#fff',
        width: 160,
        padding: 12,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    groupHeader: {
        marginBottom: 10,
        position: 'relative',
    },
    groupImage: {
        width: '100%',
        height: 100,
        borderRadius: 16,
    },
    groupPlaceholder: {
        width: '100%',
        height: 100,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    groupEmoji: {
        fontSize: 40,
    },
    liveIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(25, 176, 145, 0.9)', // Green
        paddingHorizontal: 6,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    liveDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#fff',
    },
    liveText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '800',
    },
    groupName: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 6,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    activityText: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
    },
    // News
    newsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 24,
        marginBottom: 12,
        padding: 16,
        borderRadius: 16,
        gap: 16,
    },
    newsIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: SOUP_COLORS.pink,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newsContent: {
        flex: 1,
    },
    newsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    newsMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    newsTag: {
        fontSize: 11,
        fontWeight: '600',
        color: SOUP_COLORS.pink,
        textTransform: 'uppercase',
    },
    newsDate: {
        fontSize: 11,
        color: SOUP_COLORS.subtext,
    },
});
