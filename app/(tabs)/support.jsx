import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, Platform, LayoutAnimation, UIManager, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { LifeBuoy, ChevronDown, ChevronUp, Mail, MessageSquare, Bug, ExternalLink, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Brand Colors
const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ec008b',
    green: '#19b091',
    cream: '#FDF5E6',
    text: '#2d3436',
    subtext: '#636e72',
    card: '#ffffff',
};

// FAQ Data
const FAQS = [
    {
        question: "How do I join a group?",
        answer: "Go to the Community tab 🌍, browse the 'Bustling Kitchens', and tap any group card to jump right into the chat!"
    },
    {
        question: "What is a Flavor Profile?",
        answer: "Your Flavor Profile tracks your language journey. As you speak more minutes, you move from A1 (Novice) to C2 (Master). Check your Profile tab to see your progress!"
    },
    {
        question: "Is Language Soup free?",
        answer: "Yes! The kitchen is open to everyone. We might offer premium spices (features) in the future, but the soup is always free."
    },
    {
        question: "Can I create my own group?",
        answer: "Currently, groups are curated by our admins to ensure high quality and safety. You can suggest a new language group via the 'Feedback' button below!"
    }
];

export default function SupportScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [chatLoading, setChatLoading] = useState(false);

    const toggleExpand = (index) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    const handleEmail = (subject) => {
        Linking.openURL(`mailto:noah@language-soup.com?subject=${subject}&body=Device: ${Platform.OS} ${Platform.Version}`);
    };

    const handleWebLink = (url) => {
        Linking.openURL(url);
    };

    const handleSupportChat = async () => {
        if (!user || chatLoading) return;
        setChatLoading(true);

        try {
            // 1. Check if user already has a Support group
            const { data: existingMemberships, error: checkError } = await supabase
                .from('app_group_members')
                .select('group_id, app_groups!inner(language)')
                .eq('user_id', user.id)
                .eq('app_groups.language', 'Support')
                .limit(1);

            if (checkError) throw checkError;

            let targetGroupId;

            if (existingMemberships && existingMemberships.length > 0) {
                targetGroupId = existingMemberships[0].group_id;
            } else {
                // 2. Create new private support group
                const { data: newGroup, error: createError } = await supabase
                    .from('app_groups')
                    .insert({
                        name: 'Soup Support 🛟',
                        language: 'Support',
                        level: 'Admin',
                        member_count: 1,
                        avatar_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=200'
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                targetGroupId = newGroup.id;

                // 3. Add user to the group
                const { error: joinError } = await supabase
                    .from('app_group_members')
                    .insert({ user_id: user.id, group_id: targetGroupId, role: 'member' });

                if (joinError) throw joinError;

                // 4. Create initial challenge for support group
                const { data: challenge, error: challengeError } = await supabase
                    .from('app_challenges')
                    .insert({
                        group_id: targetGroupId,
                        prompt_text: 'How can we help you today?'
                    })
                    .select()
                    .single();

                if (challengeError) throw challengeError;

                // 5. Post initial Welcome Message
                await supabase.from('app_messages').insert({
                    group_id: targetGroupId,
                    challenge_id: challenge.id,
                    sender_id: user.id,
                    message_type: 'system',
                    content: 'Welcome to your private support channel! 🥣 An admin will be with you shortly.'
                });
            }

            // 5. Navigate
            router.push(`/chat/${targetGroupId}`);

        } catch (error) {
            console.error('Support chat error:', error);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.iconCircle}>
                    <LifeBuoy size={28} color="#fff" />
                </View>
                <View>
                    <Text style={styles.headerTitle}>Help Center</Text>
                    <Text style={styles.headerSubtitle}>We're here to help you cook.</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* 24/7 Chat Action - Featured */}
                <Pressable
                    style={({ pressed }) => [styles.chatCard, pressed && { opacity: 0.9 }]}
                    onPress={handleSupportChat}
                    disabled={chatLoading}
                >
                    <View style={styles.chatCardContent}>
                        <View style={styles.chatIcon}>
                            <MessageCircle size={28} color="#fff" />
                        </View>
                        <View style={styles.chatInfo}>
                            <Text style={styles.chatTitle}>24/7 Live Support Chat</Text>
                            <Text style={styles.chatSubtitle}>Talk directly with our admins.</Text>
                        </View>
                        {chatLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ExternalLink size={20} color="rgba(255,255,255,0.8)" />
                        )}
                    </View>
                </Pressable>

                {/* FAQ Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Soup 101 🥣</Text>

                    {FAQS.map((faq, index) => {
                        const isExpanded = expandedIndex === index;
                        return (
                            <Pressable
                                key={index}
                                style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}
                                onPress={() => toggleExpand(index)}
                            >
                                <View style={styles.faqHeader}>
                                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                                    {isExpanded ?
                                        <ChevronUp size={20} color={SOUP_COLORS.subtext} /> :
                                        <ChevronDown size={20} color={SOUP_COLORS.subtext} />
                                    }
                                </View>
                                {isExpanded && (
                                    <View style={styles.faqBody}>
                                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* Contact Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Get in Touch 📬</Text>

                    <Pressable style={styles.actionCard} onPress={() => handleEmail('Bug Report 🐛')}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(236,0,139,0.1)' }]}>
                            <Bug size={24} color={SOUP_COLORS.pink} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Report a Bug</Text>
                            <Text style={styles.actionSubtitle}>Something broken in the kitchen?</Text>
                        </View>
                        <ExternalLink size={16} color={SOUP_COLORS.subtext} />
                    </Pressable>

                    <Pressable style={styles.actionCard} onPress={() => handleEmail('Feature Request 💡')}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(0,173,239,0.1)' }]}>
                            <MessageSquare size={24} color={SOUP_COLORS.blue} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Suggest a Feature</Text>
                            <Text style={styles.actionSubtitle}>Tell us what you want to see.</Text>
                        </View>
                        <ExternalLink size={16} color={SOUP_COLORS.subtext} />
                    </Pressable>

                    <Pressable style={styles.actionCard} onPress={() => handleEmail('General Inquiry 💬')}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(25,176,145,0.1)' }]}>
                            <Mail size={24} color={SOUP_COLORS.green} />
                        </View>
                        <View style={styles.actionInfo}>
                            <Text style={styles.actionTitle}>Contact Support</Text>
                            <Text style={styles.actionSubtitle}>Questions, love letters, or recipes.</Text>
                        </View>
                        <ExternalLink size={16} color={SOUP_COLORS.subtext} />
                    </Pressable>
                </View>

                {/* Version Info */}
                <View style={styles.footer}>
                    <Text style={styles.versionText}>Language Soup v1.0.0 (Beta)</Text>
                    <Text style={styles.copyrightText}>Made with ❤️ globally.</Text>
                </View>

                <View style={{ height: 100 }} />
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 24,
        gap: 16,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: SOUP_COLORS.text,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: SOUP_COLORS.text,
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 24,
    },
    chatCard: {
        backgroundColor: SOUP_COLORS.blue,
        borderRadius: 20,
        marginBottom: 32,
        overflow: 'hidden',
        shadowColor: SOUP_COLORS.blue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    chatCardContent: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chatIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    chatInfo: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    chatSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '500',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 16,
    },
    // FAQ
    faqCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    faqCardExpanded: {
        // Optional active state style
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        fontSize: 16,
        fontWeight: '700',
        color: SOUP_COLORS.text,
        flex: 1,
        marginRight: 10,
    },
    faqBody: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    faqAnswer: {
        fontSize: 14,
        color: SOUP_COLORS.subtext,
        lineHeight: 20,
    },
    // Actions
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionInfo: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: SOUP_COLORS.text,
        marginBottom: 4,
    },
    actionSubtitle: {
        fontSize: 13,
        color: SOUP_COLORS.subtext,
    },
    // Footer
    footer: {
        alignItems: 'center',
        gap: 4,
        opacity: 0.5,
        marginTop: 10,
    },
    versionText: {
        fontSize: 12,
        fontWeight: '600',
        color: SOUP_COLORS.text,
    },
    copyrightText: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
    },
});
