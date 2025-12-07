import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Eye } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const SOUP_COLORS = {
    blue: '#00adef',
    green: '#6bcf7f',
    yellow: '#ffd93d',
    cream: '#fffbf5',
    subtext: '#666',
};

export default function LanguageRequests() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const { data, error } = await supabase
                .from('app_language_requests')
                .select(`
                    *,
                    app_users!app_language_requests_user_id_fkey(display_name, avatar_url)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map to expected format
            const formattedData = data?.map(req => ({
                ...req,
                user: req.app_users
            })) || [];

            setRequests(formattedData);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (requestId, newStatus) => {
        try {
            const { error } = await supabase
                .from('app_language_requests')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (error) throw error;

            // Update local state
            setRequests(prev => prev.map(req =>
                req.id === requestId ? { ...req, status: newStatus } : req
            ));

            Alert.alert('Success', `Request marked as ${newStatus}`);
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return SOUP_COLORS.yellow;
            case 'reviewed': return SOUP_COLORS.blue;
            case 'added': return SOUP_COLORS.green;
            default: return '#999';
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderRequest = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <View>
                    <Text style={styles.userName}>{item.user?.display_name || 'Anonymous'}</Text>
                    <Text style={styles.requestDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <Text style={styles.requestLanguage}>📚 {item.language_name}</Text>

            {item.status === 'pending' && (
                <View style={styles.actions}>
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: `${SOUP_COLORS.blue}20` }]}
                        onPress={() => updateStatus(item.id, 'reviewed')}
                    >
                        <Eye size={16} color={SOUP_COLORS.blue} />
                        <Text style={[styles.actionText, { color: SOUP_COLORS.blue }]}>Mark Reviewed</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: `${SOUP_COLORS.green}20` }]}
                        onPress={() => updateStatus(item.id, 'added')}
                    >
                        <Check size={16} color={SOUP_COLORS.green} />
                        <Text style={[styles.actionText, { color: SOUP_COLORS.green }]}>Mark Added</Text>
                    </Pressable>
                </View>
            )}
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
                <Text style={styles.headerTitle}>Language Requests</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={requests}
                renderItem={renderRequest}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No language requests yet</Text>
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
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
    list: {
        padding: 16,
    },
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 2,
    },
    requestDate: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    requestLanguage: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    requestMessage: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        lineHeight: 20,
        marginBottom: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    empty: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 15,
        color: SOUP_COLORS.subtext,
    },
});
