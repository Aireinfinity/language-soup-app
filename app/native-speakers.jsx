import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, Pressable, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SpeakerCard from '../components/SpeakerCard';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
};

const AVAILABLE_LANGUAGES = ['All', 'French', 'Spanish', 'Japanese', 'German', 'Italian'];

export default function NativeSpeakersScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const preselectedLanguage = params.language || 'All';

    const [speakers, setSpeakers] = useState([]);
    const [filteredSpeakers, setFilteredSpeakers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState(preselectedLanguage);
    const [isAdmin, setIsAdmin] = useState(false);
    const [hasProfile, setHasProfile] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadSpeakers(), checkUserProfile()]);
        setRefreshing(false);
    };

    const checkUserProfile = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('app_native_speakers')
                .select('id')
                .eq('user_id', user.id)
                .single();

            setHasProfile(!!data);
        } catch (error) {
            console.error('Error checking user profile:', error);
        }
    };

    useEffect(() => {
        loadSpeakers();
        checkUserProfile();

        // Subscribe to real-time changes (INSERT and UPDATE only, not DELETE)
        const channel = supabase
            .channel('native-speakers-changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'app_native_speakers' },
                () => {
                    loadSpeakers();
                    checkUserProfile();
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'app_native_speakers' },
                () => {
                    loadSpeakers();
                    checkUserProfile();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        filterSpeakers();
    }, [selectedLanguage, speakers]);

    const loadSpeakers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('app_native_speakers')
                .select('*')
                .eq('is_active', true)
                .contains('languages', ['French'])
                .order('display_name');

            if (error) throw error;

            setSpeakers(data || []);
        } catch (error) {
            console.error('Error loading speakers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterSpeakers = () => {
        if (selectedLanguage === 'All') {
            setFilteredSpeakers(speakers);
        } else {
            setFilteredSpeakers(
                speakers.filter(speaker => speaker.languages.includes(selectedLanguage))
            );
        }
    };

    const renderLanguageFilter = () => (
        <View style={styles.filterContainer}>
            <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={AVAILABLE_LANGUAGES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <Pressable
                        style={[
                            styles.filterChip,
                            selectedLanguage === item && styles.filterChipActive
                        ]}
                        onPress={() => setSelectedLanguage(item)}
                    >
                        <Text style={[
                            styles.filterChipText,
                            selectedLanguage === item && styles.filterChipTextActive
                        ]}>
                            {item}
                        </Text>
                    </Pressable>
                )}
                contentContainerStyle={styles.filterList}
            />
        </View>
    );

    const handleEditProfile = (speakerId) => {
        router.push('/add-native-speaker');
    };

    const handleDeleteProfile = async (speakerId) => {
        Alert.alert(
            'Delete Profile',
            'Are you sure you want to delete this profile? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Immediately remove from UI with new array reference
                            const newSpeakers = speakers.filter(s => s.id !== speakerId);
                            const newFiltered = filteredSpeakers.filter(s => s.id !== speakerId);

                            setSpeakers(newSpeakers);
                            setFilteredSpeakers(newFiltered);

                            // Then delete from database
                            const { error } = await supabase
                                .from('app_native_speakers')
                                .delete()
                                .eq('id', speakerId);

                            if (error) throw error;

                            // Update hasProfile state
                            await checkUserProfile();

                            Alert.alert('Success', 'Profile deleted successfully');
                        } catch (error) {
                            console.error('Error deleting profile:', error);
                            Alert.alert('Error', 'Failed to delete profile');
                            // Reload on error to restore state
                            await loadSpeakers();
                        }
                    }
                }
            ]
        );
    };

    const renderSpeaker = ({ item }) => {
        const isOwner = item.user_id === user?.id;

        return (
            <SpeakerCard
                speaker={item}
                isOwner={isOwner}
                onEdit={() => handleEditProfile(item.id)}
                onDelete={() => handleDeleteProfile(item.id)}
            />
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={SOUP_COLORS.blue} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={SOUP_COLORS.text} />
                </Pressable>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Ready for Language Exchange?</Text>
                    <Text style={styles.subtitle}>Practice French with real people 🇫🇷</Text>
                </View>
            </View>

            {/* Add/Edit Button */}
            {hasProfile ? (
                <Pressable style={styles.editProfileButton} onPress={() => router.push('/add-native-speaker')}>
                    <Text style={styles.editProfileText}>✏️ Edit My Profile</Text>
                </Pressable>
            ) : (
                <Pressable style={styles.addYourselfButton} onPress={() => router.push('/add-native-speaker')}>
                    <Text style={styles.addYourselfText}>+ Sign up for Language Exchange</Text>
                </Pressable>
            )}

            {/* Speakers List */}
            <FlatList
                data={filteredSpeakers}
                renderItem={renderSpeaker}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                extraData={filteredSpeakers.length} // Force re-render when list changes
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={SOUP_COLORS.blue}
                        colors={[SOUP_COLORS.blue]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🔍</Text>
                        <Text style={styles.emptyText}>No speakers found</Text>
                        <Text style={styles.emptySubtext}>
                            Try selecting a different language
                        </Text>
                    </View>
                }
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        gap: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: SOUP_COLORS.text,
    },
    subtitle: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    filterContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    filterList: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: SOUP_COLORS.blue,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    filterChipTextActive: {
        color: '#fff',
    },
    list: {
        padding: 16,
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: SOUP_COLORS.text,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
    },
    addYourselfButton: {
        backgroundColor: SOUP_COLORS.green,
        marginHorizontal: 16,
        marginVertical: 12,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    addYourselfText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    editProfileButton: {
        backgroundColor: SOUP_COLORS.blue,
        marginHorizontal: 16,
        marginVertical: 12,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    editProfileText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
