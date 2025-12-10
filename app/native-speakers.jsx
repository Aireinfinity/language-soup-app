import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, Pressable, SafeAreaView } from 'react-native';
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

    useEffect(() => {
        loadSpeakers();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('native-speakers-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'app_native_speakers' },
                () => {
                    loadSpeakers();
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

    const deleteSpeaker = async (speakerId) => {
        try {
            const { error } = await supabase
                .from('app_native_speakers')
                .delete()
                .eq('id', speakerId);

            if (error) throw error;

            // Refresh list
            loadSpeakers();
        } catch (error) {
            console.error('Error deleting speaker:', error);
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

    const renderSpeaker = ({ item }) => (
        <SpeakerCard
            speaker={item}
            isAdmin={isAdmin}
            onDelete={() => deleteSpeaker(item.id)}
        />
    );

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

            {/* Add Yourself Button */}
            <Pressable style={styles.addYourselfButton} onPress={() => router.push('/add-native-speaker')}>
                <Text style={styles.addYourselfText}>+ Sign up for Language Exchange</Text>
            </Pressable>

            {/* Speakers List */}
            <FlatList
                data={filteredSpeakers}
                renderItem={renderSpeaker}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
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
});
