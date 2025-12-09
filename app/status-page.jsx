import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, AlertCircle, Wrench, CheckCircle, Lightbulb, Clock } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    cream: '#fffbf5',
    red: '#FF3B30',
    yellow: '#FFCC00',
    green: '#34C759',
    subtext: '#666',
};

export default function StatusPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [highPriority, setHighPriority] = useState([]);
    const [workingOnIt, setWorkingOnIt] = useState([]);
    const [recentlyFixed, setRecentlyFixed] = useState([]);
    const [featureRequests, setFeatureRequests] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        loadStatusItems();

        // Subscribe to updates
        const channel = supabase
            .channel('status-page')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'app_support_messages',
                filter: 'public_visible=eq.true'
            }, () => {
                loadStatusItems();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadStatusItems = async () => {
        try {
            // Get all public visible support items
            const { data, error } = await supabase
                .from('app_support_messages')
                .select('*')
                .eq('public_visible', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by status and priority
            const high = data?.filter(item =>
                item.priority === 'P0' &&
                (item.status === 'investigating' || item.status === 'fixing')
            ) || [];

            const working = data?.filter(item =>
                item.priority === 'P1' &&
                (item.status === 'investigating' || item.status === 'fixing')
            ) || [];

            const fixed = data?.filter(item => {
                if (item.status !== 'fixed' || !item.fixed_at) return false;
                const fixedDate = new Date(item.fixed_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return fixedDate >= weekAgo;
            }) || [];

            const features = data?.filter(item =>
                item.category === 'feature_request' &&
                item.status !== 'fixed' &&
                item.status !== 'wontfix'
            ) || [];

            setHighPriority(high);
            setWorkingOnIt(working);
            setRecentlyFixed(fixed);
            setFeatureRequests(features);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error loading status items:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (hours < 1) return 'just now';
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const renderStatusItem = (item, showAffectedCount = false) => (
        <View key={item.id} style={styles.statusItem}>
            <Text style={styles.statusTitle}>{item.title || item.content}</Text>
            <View style={styles.statusMeta}>
                <Text style={styles.statusText}>
                    status: {item.status === 'investigating' ? 'looking into it' :
                        item.status === 'fixing' ? 'fix going out soon' :
                            item.status}
                </Text>
                {showAffectedCount && item.affected_user_ids?.length > 0 && (
                    <Text style={styles.affectedCount}>
                        reported by: {item.affected_user_ids.length} {item.affected_user_ids.length === 1 ? 'person' : 'people'}
                    </Text>
                )}
            </View>
        </View>
    );

    const renderFixedItem = (item) => (
        <View key={item.id} style={styles.fixedItem}>
            <CheckCircle size={16} color={SOUP_COLORS.green} />
            <View style={styles.fixedInfo}>
                <Text style={styles.fixedTitle}>{item.title || item.content}</Text>
                <Text style={styles.fixedDate}>
                    fixed {item.fixed_at ? new Date(item.fixed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'recently'}
                </Text>
            </View>
        </View>
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
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>Known Issues</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.intro}>
                    we're actively working on making language soup better! here's what's happening:
                </Text>

                {/* High Priority Section */}
                {highPriority.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <AlertCircle size={20} color={SOUP_COLORS.red} />
                            <Text style={[styles.sectionTitle, { color: SOUP_COLORS.red }]}>
                                🔴 HIGH PRIORITY (fixing now)
                            </Text>
                        </View>
                        {highPriority.map(item => renderStatusItem(item, true))}
                    </View>
                )}

                {/* Working On It Section */}
                {workingOnIt.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Wrench size={20} color={SOUP_COLORS.yellow} />
                            <Text style={[styles.sectionTitle, { color: SOUP_COLORS.yellow }]}>
                                🟡 WORKING ON IT (this week)
                            </Text>
                        </View>
                        {workingOnIt.map(item => renderStatusItem(item, true))}
                    </View>
                )}

                {/* Recently Fixed Section */}
                {recentlyFixed.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <CheckCircle size={20} color={SOUP_COLORS.green} />
                            <Text style={[styles.sectionTitle, { color: SOUP_COLORS.green }]}>
                                ✅ RECENTLY FIXED
                            </Text>
                        </View>
                        {recentlyFixed.map(renderFixedItem)}
                    </View>
                )}

                {/* Feature Requests Section */}
                {featureRequests.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Lightbulb size={20} color={SOUP_COLORS.blue} />
                            <Text style={[styles.sectionTitle, { color: SOUP_COLORS.blue }]}>
                                💡 FEATURE REQUESTS (on the roadmap)
                            </Text>
                        </View>
                        {featureRequests.map(item => (
                            <View key={item.id} style={styles.featureItem}>
                                <Text style={styles.featureTitle}>{item.title || item.content}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Empty State */}
                {highPriority.length === 0 && workingOnIt.length === 0 &&
                    recentlyFixed.length === 0 && featureRequests.length === 0 && (
                        <View style={styles.emptyState}>
                            <CheckCircle size={64} color={SOUP_COLORS.green} />
                            <Text style={styles.emptyTitle}>all clear! 🎉</Text>
                            <Text style={styles.emptyText}>
                                no known issues right now. if you find a bug, let us know!
                            </Text>
                        </View>
                    )}

                {/* Last Updated */}
                <View style={styles.footer}>
                    <Clock size={14} color={SOUP_COLORS.subtext} />
                    <Text style={styles.footerText}>
                        last updated: {getTimeAgo(lastUpdated)}
                    </Text>
                </View>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    content: {
        padding: 20,
    },
    intro: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
        lineHeight: 22,
        marginBottom: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: SOUP_COLORS.blue,
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
        lineHeight: 20,
    },
    statusMeta: {
        gap: 4,
    },
    statusText: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
        fontStyle: 'italic',
    },
    affectedCount: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    fixedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    fixedInfo: {
        flex: 1,
    },
    fixedTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
        marginBottom: 2,
    },
    fixedDate: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    featureItem: {
        paddingVertical: 10,
        paddingLeft: 16,
        borderLeftWidth: 2,
        borderLeftColor: SOUP_COLORS.blue,
        marginBottom: 8,
    },
    featureTitle: {
        fontSize: 14,
        color: '#000',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 32,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    footerText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
});
