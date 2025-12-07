import React, { useState } from 'react';
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

export default function CreateGroup() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        language: 'French',
        description: '',
        createFirstChallenge: true,
        firstChallengePrompt: ''
    });

    const handleCreate = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        if (formData.createFirstChallenge && !formData.firstChallengePrompt.trim()) {
            Alert.alert('Error', 'Please enter a first challenge or uncheck the option');
            return;
        }

        setLoading(true);
        Keyboard.dismiss();
        try {
            // Create group
            const { data: newGroup, error: groupError } = await supabase
                .from('app_groups')
                .insert({
                    name: formData.name,
                    language: formData.language,
                    description: formData.description,
                    member_count: 0
                })
                .select()
                .single();

            if (groupError) throw groupError;

            // Create first challenge if requested
            if (formData.createFirstChallenge && newGroup) {
                const { error: challengeError } = await supabase
                    .from('app_challenges')
                    .insert({
                        prompt_text: formData.firstChallengePrompt,
                        target_language: formData.language,
                        group_id: newGroup.id,
                        created_by: user.id
                    });

                if (challengeError) console.error('Challenge creation failed:', challengeError);
            }

            Alert.alert('Success', 'Group created successfully!');
            router.back();
        } catch (error) {
            console.error('Error creating group:', error);
            Alert.alert('Error', 'Failed to create group');
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
                    <Text style={styles.headerTitle}>Create Group</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.section}>
                        <Text style={styles.label}>Group Name *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            placeholder="e.g., French Beginners"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Language *</Text>
                        <View style={styles.languageOptions}>
                            {['French', 'Spanish', 'German', 'Italian', 'Japanese', 'Korean'].map(lang => (
                                <Pressable
                                    key={lang}
                                    style={[
                                        styles.languageButton,
                                        formData.language === lang && styles.languageButtonActive
                                    ]}
                                    onPress={() => setFormData(prev => ({ ...prev, language: lang }))}
                                >
                                    <Text style={[
                                        styles.languageText,
                                        formData.language === lang && styles.languageTextActive
                                    ]}>{lang}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Description (Optional)</Text>
                        <TextInput
                            style={styles.textArea}
                            value={formData.description}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                            placeholder="Describe what this group is about..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.section}>
                        <Pressable
                            style={styles.checkboxRow}
                            onPress={() => setFormData(prev => ({ ...prev, createFirstChallenge: !prev.createFirstChallenge }))}
                        >
                            <View style={[styles.checkbox, formData.createFirstChallenge && styles.checkboxActive]}>
                                {formData.createFirstChallenge && <View style={styles.checkboxDot} />}
                            </View>
                            <Text style={styles.checkboxLabel}>Create first challenge</Text>
                        </Pressable>

                        {formData.createFirstChallenge && (
                            <TextInput
                                style={[styles.textArea, { marginTop: 12 }]}
                                value={formData.firstChallengePrompt}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, firstChallengePrompt: text }))}
                                placeholder="First challenge prompt..."
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={3}
                            />
                        )}
                    </View>

                    <Pressable
                        style={[styles.createButton, loading && styles.createButtonDisabled]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Group</Text>
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
    textInput: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#000',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    textArea: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#000',
        minHeight: 100,
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
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#ccc',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        borderColor: SOUP_COLORS.blue,
    },
    checkboxDot: {
        width: 12,
        height: 12,
        borderRadius: 3,
        backgroundColor: SOUP_COLORS.blue,
    },
    checkboxLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
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
