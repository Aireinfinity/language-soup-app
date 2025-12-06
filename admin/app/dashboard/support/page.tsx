'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SupportChat {
    id: string;
    name: string;
    created_at: string;
    member_count: number;
}

interface Message {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    message_type: string;
    sender?: { display_name: string };
}

export default function SupportPage() {
    const [supportChats, setSupportChats] = useState<SupportChat[]>([]);
    const [selectedChat, setSelectedChat] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSupportChats();
    }, []);

    useEffect(() => {
        if (selectedChat) {
            loadMessages(selectedChat);
        }
    }, [selectedChat]);

    const loadSupportChats = async () => {
        try {
            const { data, error } = await supabase
                .from('app_groups')
                .select('id, name, created_at, member_count')
                .eq('language', 'Support')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSupportChats(data || []);

            if (data && data.length > 0) {
                setSelectedChat(data[0].id);
            }
        } catch (error) {
            console.error('Error loading support chats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (chatId: string) => {
        try {
            const { data, error } = await supabase
                .from('app_messages')
                .select('*, sender:sender_id(display_name)')
                .eq('group_id', chatId)
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Support Chats</h1>

            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
                {/* Chat List */}
                <div className="col-span-4 bg-white rounded-lg shadow overflow-auto">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="font-bold text-gray-900">Active Tickets ({supportChats.length})</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {supportChats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => setSelectedChat(chat.id)}
                                className={`w-full text-left p-4 hover:bg-gray-50 transition ${selectedChat === chat.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                    }`}
                            >
                                <div className="font-medium text-gray-900">{chat.name}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {new Date(chat.created_at).toLocaleDateString()}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Messages */}
                <div className="col-span-8 bg-white rounded-lg shadow flex flex-col">
                    <div className="p-4 border-b border-gray-200">
                        <h2 className="font-bold text-gray-900">
                            {supportChats.find(c => c.id === selectedChat)?.name || 'Select a chat'}
                        </h2>
                    </div>

                    <div className="flex-1 overflow-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className="flex flex-col">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-medium text-gray-900 text-sm">
                                        {message.sender?.display_name || 'Unknown'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(message.created_at).toLocaleTimeString()}
                                    </span>
                                </div>
                                <div className={`inline-block max-w-2xl rounded-lg px-4 py-2 ${message.message_type === 'system'
                                        ? 'bg-gray-100 text-gray-700 text-sm italic'
                                        : 'bg-gray-100 text-gray-900'
                                    }`}>
                                    {message.message_type === 'voice' ? (
                                        <span className="text-sm">🎤 Voice message</span>
                                    ) : (
                                        message.content
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
