
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Search, Send, User, MessageCircle, RefreshCw } from 'lucide-react';

export default function SupportInbox() {
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadThreads();

        // Realtime subscription for new messages
        const channel = supabase
            .channel('support-inbox')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_support_messages' }, () => {
                loadThreads();
                if (activeThread) {
                    loadMessages(activeThread.userId);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeThread]);

    const loadThreads = async () => {
        try {
            // Fetch all messages to group them
            const { data, error } = await supabase
                .from('app_support_messages')
                .select(`
          id,
          user_id,
          content,
          created_at,
          from_admin,
          app_users (
            display_name,
            avatar_url
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by user
            const threadMap = new Map();

            data.forEach(msg => {
                if (!threadMap.has(msg.user_id)) {
                    threadMap.set(msg.user_id, {
                        userId: msg.user_id,
                        userName: msg.app_users?.display_name || 'Anonymous',
                        userAvatar: msg.app_users?.avatar_url,
                        lastMessage: msg.content,
                        lastMessageTime: msg.created_at,
                        isLastFromAdmin: msg.from_admin,
                        unreadCount: 0 // Could calculate this if we had a read status
                    });
                }
            });

            setThreads(Array.from(threadMap.values()));
        } catch (err) {
            console.error('Error loading threads:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('app_support_messages')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
            scrollToBottom();
        } catch (err) {
            console.error('Error loading messages:', err);
        }
    };

    const handleThreadClick = (thread) => {
        setActiveThread(thread);
        loadMessages(thread.userId);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !activeThread) return;

        setSending(true);
        try {
            const { error } = await supabase
                .from('app_support_messages')
                .insert({
                    user_id: activeThread.userId,
                    content: inputText.trim(),
                    from_admin: true,
                    message_type: 'text',
                    created_at: new Date().toISOString()
                });

            if (error) throw error;

            setInputText('');
            loadMessages(activeThread.userId);
        } catch (err) {
            console.error('Error sending message:', err);
            alert('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return <div className="p-8 text-gray-500 font-bold animate-pulse">Loading conversations...</div>;
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Sidebar List */}
            <div className={`w-full lg:w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/30 ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-4 border-b border-gray-100 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search people..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-[var(--soup-turquoise)]/20 rounded-xl text-sm font-bold focus:ring-0 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {threads.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 font-medium">No conversations yet</div>
                    ) : (
                        threads.map(thread => (
                            <button
                                key={thread.userId}
                                onClick={() => handleThreadClick(thread)}
                                className={`w-full p-4 flex items-start gap-3 border-b border-gray-50 transition-all hover:bg-gray-50 text-left ${activeThread?.userId === thread.userId ? 'bg-blue-50/50 border-l-4 border-l-[var(--soup-turquoise)]' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="relative">
                                    {thread.userAvatar ? (
                                        <img src={thread.userAvatar} className="w-12 h-12 rounded-full object-cover border border-black/5 shadow-sm" alt="" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                                            {thread.userName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {/* Status indicator could go here */}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="font-bold text-gray-900 truncate">{thread.userName}</h3>
                                        <span className="text-[10px] font-medium text-gray-400">{new Date(thread.lastMessageTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate font-medium">
                                        {thread.isLastFromAdmin && <span className="text-[var(--soup-turquoise)]">You: </span>}
                                        {thread.lastMessage}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-white ${activeThread ? 'flex' : 'hidden lg:flex'}`}>
                {activeThread ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-sm z-10">
                            <div className="flex items-center gap-3">
                                {/* Back button for mobile */}
                                <button
                                    onClick={() => setActiveThread(null)}
                                    className="lg:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                                    {activeThread.userAvatar ? (
                                        <img src={activeThread.userAvatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
                                            {activeThread.userName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900">{activeThread.userName}</h2>
                                    <p className="text-xs text-gray-500 font-medium">Support Conversation</p>
                                </div>
                            </div>
                            <button
                                onClick={() => loadMessages(activeThread.userId)}
                                className="p-2 text-gray-400 hover:text-[var(--soup-turquoise)] hover:bg-blue-50 rounded-full transition-all"
                                title="Refresh messages"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                            {messages.map((msg, index) => {
                                const isAdmin = msg.from_admin;
                                return (
                                    <div key={msg.id || index} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] group flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                            <div
                                                className={`px-5 py-3 rounded-2xl shadow-sm text-sm font-medium leading-relaxed ${isAdmin
                                                    ? 'bg-[var(--soup-turquoise)] text-white rounded-br-none'
                                                    : 'bg-white text-gray-800 border border-black/5 rounded-bl-none'
                                                    }`}
                                            >
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-gray-100 bg-white">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 px-5 py-3 bg-gray-100 border-transparent focus:bg-white focus:border-[var(--soup-turquoise)]/20 rounded-xl font-medium focus:ring-0 transition-all"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || sending}
                                    className="px-5 bg-[var(--soup-turquoise)] text-white rounded-xl hover:bg-[#009bd6] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <MessageCircle size={32} className="text-gray-300" />
                        </div>
                        <p className="font-bold text-lg text-gray-300">Select a conversation to start replying</p>
                    </div>
                )}
            </div>
        </div>
    );
}
