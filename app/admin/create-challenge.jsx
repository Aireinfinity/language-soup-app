import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const SOUP_COLORS = {
    blue: '#00adef',
    cream: '#fffbf5',
    subtext: '#666',
};

export default function CreateChallenge() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState([]);
    const [formData, setFormData] = useState({
        promptText: '',
        groupId: ''
    });

    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        const { data } = await supabase
            .from('app_groups')
            .select('id, name, language')
            .order('name');

        setGroups(data || []);
        if (data?.length > 0) {
            setFormData(prev => ({ ...prev, groupId: data[0].id }));
        }
    };

    const handleCreate = async () => {
        if (!formData.promptText.trim()) {
            Alert.alert('Error', 'Please enter a challenge prompt');
            return;
        }

        if (!formData.groupId) {
            Alert.alert('Error', 'Please select a group');
            return;
        }

        setLoading(true);
        Keyboard.dismiss();
        try {
            const { error } = await supabase
                .from('app_challenges')
                .insert({
                    prompt_text: formData.promptText,
                    group_id: formData.groupId
                });

            if (error) throw error;

            Alert.alert('Success', 'Challenge created successfully!');
            router.back();
        } catch (error) {
            console.error('Error creating challenge:', error);
            Alert.alert('Error', 'Failed to create challenge');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#000" />
                    </Pressable>
                    <Text style={styles.headerTitle}>Create Challenge</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.section}>
                        <Text style={styles.label}>Challenge Prompt *</Text>
                        <TextInput
                            style={styles.textArea}
                            value={formData.promptText}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, promptText: text }))}
                            placeholder="e.g., Describe your favorite childhood memory"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Assign to Group *</Text>
                        {groups.map(group => (
                            <Pressable
                                key={group.id}
                                style={[
                                    styles.groupOption,
                                    formData.groupId === group.id && styles.groupOptionActive
                                ]}
                                onPress={() => setFormData(prev => ({ ...prev, groupId: group.id }))}
                            >
                                <View>
                                    <Text style={styles.groupName}>{group.name}</Text>
                                    <Text style={styles.groupLanguage}>{group.language}</Text>
                                </View>
                                <View style={[
                                    styles.radio,
                                    formData.groupId === group.id && styles.radioActive
                                ]} />
                            </Pressable>
                        ))}
                    </View>

                    <Pressable
                        style={[styles.createButton, loading && styles.createButtonDisabled]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Challenge</Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
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
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 8,
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#000',
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    languageOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    languageButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    languageButtonActive: {
        backgroundColor: SOUP_COLORS.blue,
        borderColor: SOUP_COLORS.blue,
    },
    languageText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    languageTextActive: {
        color: '#fff',
    },
    groupOption: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    groupOptionActive: {
        borderColor: SOUP_COLORS.blue,
    },
    groupName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    groupLanguage: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#ccc',
    },
    radioActive: {
        borderColor: SOUP_COLORS.blue,
        backgroundColor: SOUP_COLORS.blue,
    },
    createButton: {
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 32,
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
