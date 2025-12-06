import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SOUP_COLORS = {
    blue: '#00adef',
    pink: '#ff6b9d',
    cream: '#fffbf5',
    subtext: '#666',
};

export default function SupportChatScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef(null);

    useEffect(() => {
        loadMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel('support-messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'app_support_messages',
                filter: `user_id=eq.${user.id}`
            }, (payload) => {
                setMessages(prev => [...prev, payload.new]);
                setTimeout(() => scrollToBottom(), 100);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user.id]);

    const loadMessages = async () => {
        try {
            const { data, error } = await supabase
                .from('app_support_messages')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            setTimeout(() => scrollToBottom(), 300);
        } catch (error) {
            console.error('Error loading support messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim()) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            const { data, error } = await supabase
                .from('app_support_messages')
                .insert({
                    user_id: user.id,
                    message: messageText,
                    from_admin: false
                })
                .select()
                .single();

            if (error) throw error;
            setMessages(prev => [...prev, data]);
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        if (flatListRef.current && messages.length > 0) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    };

    const renderMessage = ({ item }) => {
        const isFromAdmin = item.from_admin;

        return (
            <View style={[
                styles.messageRow,
                isFromAdmin ? styles.rowAdmin : styles.rowUser
            ]}>
                <View style={[
                    styles.bubble,
                    isFromAdmin ? styles.bubbleAdmin : styles.bubbleUser
                ]}>
                    <Text style={[
                        styles.messageText,
                        isFromAdmin && styles.messageTextAdmin
                    ]}>
                        {item.message}
                    </Text>
                    <Text style={[
                        styles.time,
                        isFromAdmin && styles.timeAdmin
                    ]}>
                        {new Date(item.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                        })}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={SOUP_COLORS.pink} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </Pressable>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>Chat with Noah</Text>
                    <Text style={styles.headerSubtitle}>Support • 24/7</Text>
                </View>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => scrollToBottom()}
                />

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type your message..."
                        placeholderTextColor={SOUP_COLORS.subtext}
                        multiline
                        maxLength={500}
                    />
                    <Pressable
                        onPress={sendMessage}
                        disabled={!inputText.trim() || sending}
                        style={[
                            styles.sendButton,
                            (!inputText.trim() || sending) && styles.sendButtonDisabled
                        ]}
                    >
                        <Send size={20} color="#fff" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
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
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
    headerSubtitle: {
        fontSize: 12,
        color: SOUP_COLORS.subtext,
        marginTop: 2,
    },
    listContent: {
        padding: 16,
        paddingBottom: 8,
    },
    messageRow: {
        width: '100%',
        marginBottom: 12,
    },
    rowUser: {
        alignItems: 'flex-end',
    },
    rowAdmin: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '75%',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18,
    },
    bubbleUser: {
        backgroundColor: SOUP_COLORS.blue,
        borderBottomRightRadius: 4,
    },
    bubbleAdmin: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
        color: '#fff',
        marginBottom: 4,
    },
    messageTextAdmin: {
        color: '#000',
    },
    time: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        alignSelf: 'flex-end',
    },
    timeAdmin: {
        color: SOUP_COLORS.subtext,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: SOUP_COLORS.cream,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        color: '#000',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: SOUP_COLORS.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
