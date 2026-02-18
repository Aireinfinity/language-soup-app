
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Search, Send, MessageCircle, RefreshCw } from 'lucide-react';

// Compute average response time (admin reply after user message) in minutes
function computeAverageResponseTime(messagesByUser) {
    const responseTimes = [];
    for (const msgs of Object.values(messagesByUser)) {
        const sorted = [...msgs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        let lastUserAt = null;
        for (const m of sorted) {
            if (!m.from_admin) {
                lastUserAt = new Date(m.created_at);
            } else if (lastUserAt) {
                const adminAt = new Date(m.created_at);
                const minutes = (adminAt - lastUserAt) / (60 * 1000);
                if (minutes > 0 && minutes < 60 * 24) responseTimes.push(minutes); // cap at 24h
                lastUserAt = null;
            }
        }
    }
    if (responseTimes.length === 0) return null;
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    return Math.round(avg);
}

function formatResponseTime(minutes) {
    if (minutes < 1) return 'under a minute';
    if (minutes < 60) return `~${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (m === 0) return `~${h} hr`;
    return `~${h}h ${m}m`;
}

const NOAH_USER_ID = '32ac1943-aa68-4025-b4d9-3aa7ef129fb1';
const NOAH_SUPPORT_EMAIL = 'noah@languagesoup.com';
const NOAH_TIMEZONE = 'America/New_York'; // 11pm–6am here = sleeping
const NOAH_CODING_KEY = 'noah_at_desk'; // when true, show "Noah's coding"

// Derive status: sleeping 11pm–6am Noah's timezone; else "coding" if at desk, else "on the go"
function getNoahStatus() {
    const now = new Date();
    const hour = new Date(now.toLocaleString('en-US', { timeZone: NOAH_TIMEZONE })).getHours();
    const isSleeping = hour >= 23 || hour < 6;
    if (isSleeping) return { label: "Noah's sleeping", sub: "will check when he's up" };
    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem(NOAH_CODING_KEY) === 'true') {
            return { label: "Noah's coding", sub: 'online, will reply' };
        }
    } catch (_) {}
    return { label: "Noah's on the go", sub: 'checking on phone' };
}

export default function SupportInbox() {
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [responseTimeMinutes, setResponseTimeMinutes] = useState(null);
    const [noahProfile, setNoahProfile] = useState(null);
    const [noahStatus, setNoahStatus] = useState(getNoahStatus);
    const [isAtDesk, setIsAtDesk] = useState(() => {
        try {
            return typeof localStorage !== 'undefined' && localStorage.getItem(NOAH_CODING_KEY) === 'true';
        } catch (_) { return false; }
    });
    const messagesEndRef = useRef(null);

    // Update status every minute so sleep/wake transitions show
    useEffect(() => {
        const update = () => {
            setNoahStatus(getNoahStatus());
            try {
                setIsAtDesk(typeof localStorage !== 'undefined' && localStorage.getItem(NOAH_CODING_KEY) === 'true');
            } catch (_) {}
        };
        update();
        const interval = setInterval(update, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        loadThreads();
        loadResponseTimeStats();
        loadNoahProfile();

        const channel = supabase
            .channel('support-inbox')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_support_messages' }, () => {
                loadThreads();
                loadResponseTimeStats();
                if (activeThread) loadMessages(activeThread.userId);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [activeThread]);

    const loadNoahProfile = async () => {
        try {
            const { data } = await supabase
                .from('app_users')
                .select('display_name, avatar_url')
                .eq('id', NOAH_USER_ID)
                .single();
            setNoahProfile(data || null);
        } catch (err) {
            console.error('Error loading Noah profile:', err);
        }
    };

    const toggleAtDesk = () => {
        try {
            const next = !isAtDesk;
            localStorage.setItem(NOAH_CODING_KEY, next ? 'true' : 'false');
            setIsAtDesk(next);
            setNoahStatus(getNoahStatus());
        } catch (_) {}
    };

    const loadResponseTimeStats = async () => {
        try {
            const { data, error } = await supabase
                .from('app_support_messages')
                .select('user_id, created_at, from_admin')
                .order('created_at', { ascending: true });

            if (error || !data?.length) return;

            const byUser = {};
            data.forEach(m => {
                if (!byUser[m.user_id]) byUser[m.user_id] = [];
                byUser[m.user_id].push(m);
            });

            const adminIds = ['32ac1943-aa68-4025-b4d9-3aa7ef129fb1', '29864936-719c-483b-ac6a-4d06084a48fe'];
            Object.keys(byUser).forEach(uid => {
                if (adminIds.includes(uid)) delete byUser[uid];
            });

            const avg = computeAverageResponseTime(byUser);
            setResponseTimeMinutes(avg);
        } catch (err) {
            console.error('Error loading response time stats:', err);
        }
    };

    const loadThreads = async () => {
        try {
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

            const adminIds = ['32ac1943-aa68-4025-b4d9-3aa7ef129fb1', '29864936-719c-483b-ac6a-4d06084a48fe'];
            const threadMap = new Map();

            data.forEach(msg => {
                if (!threadMap.has(msg.user_id) && !adminIds.includes(msg.user_id)) {
                    threadMap.set(msg.user_id, {
                        userId: msg.user_id,
                        userName: msg.app_users?.display_name || 'Anonymous',
                        userAvatar: msg.app_users?.avatar_url,
                        lastMessage: msg.content,
                        lastMessageTime: msg.created_at,
                        isLastFromAdmin: msg.from_admin,
                        unreadCount: 0
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

    const handlePromoteToTicket = async (msg) => {
        try {
            const title = msg.content.length > 50 ? msg.content.substring(0, 47) + '...' : msg.content;
            const { error } = await supabase
                .from('app_support_messages')
                .update({
                    is_ticket: true,
                    title: title,
                    status: 'new',
                    priority: 'P2'
                })
                .eq('id', msg.id);

            if (error) throw error;
            loadMessages(activeThread.userId);
            alert('Promoted to ticket. Check the Tickets board.');
        } catch (err) {
            console.error('Error promoting:', err);
            alert('Failed to promote to ticket');
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
        return (
            <div className="flex items-center justify-center h-[calc(100vh-140px)] rounded-3xl bg-[var(--soup-linen)]/50 border border-[var(--soup-turquoise)]/10">
                <p className="text-[var(--soup-dark)]/60 font-bold">loading your chats...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] rounded-3xl overflow-hidden animate-in fade-in duration-500 border border-[var(--soup-turquoise)]/10 shadow-lg shadow-[var(--soup-turquoise)]/5 bg-white">
            {/* Sidebar */}
            <div className={`w-full lg:w-[360px] flex flex-col bg-[var(--soup-linen)]/40 border-r border-[var(--soup-turquoise)]/10 ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
                {/* Noah's here 24/7 strip — photo, status, email, reassurance */}
                <div className="p-4 pb-2">
                    <div className="rounded-2xl bg-white border border-[var(--soup-turquoise)]/20 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 p-4">
                            <div className="relative flex-shrink-0">
                                {noahProfile?.avatar_url ? (
                                    <img src={noahProfile.avatar_url} alt="Noah" className="w-14 h-14 rounded-full object-cover border-2 border-[var(--soup-turquoise)]/30 shadow-md" />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--soup-turquoise)] to-[var(--soup-green)] flex items-center justify-center shadow-md overflow-hidden">
                                        <img src="/src/assets/ls-icon-bowl.png" alt="" className="w-9 h-9 object-contain opacity-90" />
                                    </div>
                                )}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--soup-green)] border-2 border-white" title="Noah's here" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-[var(--soup-dark)] text-sm lowercase">noah's here 24/7</p>
                                <p className="text-xs font-bold text-[var(--soup-dark)]/60">
                                    {responseTimeMinutes != null
                                        ? `usually replies in ${formatResponseTime(responseTimeMinutes)}`
                                        : "he'll reply. you're not forgotten."}
                                </p>
                            </div>
                        </div>
                        {/* Status: auto from time (11pm–6am = sleeping) + "at desk" = coding, else on the go */}
                        <div className="border-t border-[var(--soup-turquoise)]/10 px-4 py-2 bg-[var(--soup-linen)]/30 flex items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-black text-[var(--soup-dark)] uppercase tracking-wide">{noahStatus.label}</p>
                                <p className="text-[10px] font-bold text-[var(--soup-dark)]/50">{noahStatus.sub}</p>
                            </div>
                            {noahStatus.label !== "Noah's sleeping" && (
                                <button
                                    type="button"
                                    onClick={toggleAtDesk}
                                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${isAtDesk ? 'bg-[var(--soup-turquoise)]/20 text-[var(--soup-turquoise)] border-[var(--soup-turquoise)]/30' : 'text-[var(--soup-dark)]/50 border-[var(--soup-dark)]/10 hover:bg-[var(--soup-linen)]/50'}`}
                                >
                                    at my desk
                                </button>
                            )}
                        </div>
                        <div className="px-4 pb-3 pt-1">
                            <p className="text-[10px] font-bold text-[var(--soup-dark)]/50">
                                They get notified when you reply. You get notified when they message. For longer stuff: <a href={`mailto:${NOAH_SUPPORT_EMAIL}`} className="text-[var(--soup-turquoise)] underline hover:no-underline">{NOAH_SUPPORT_EMAIL}</a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--soup-dark)]/40" size={18} />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            className="w-full pl-10 pr-4 py-3 bg-white border border-[var(--soup-turquoise)]/10 rounded-xl text-sm font-bold text-[var(--soup-dark)] placeholder:text-[var(--soup-dark)]/40 focus:ring-2 focus:ring-[var(--soup-turquoise)]/20 focus:border-[var(--soup-turquoise)]/30 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-2">
                    {threads.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-[var(--soup-dark)]/50 font-bold text-sm">No one's messaged yet.</p>
                            <p className="text-[var(--soup-dark)]/40 text-xs mt-1">When they do, they'll show up here.</p>
                        </div>
                    ) : (
                        threads.map(thread => (
                            <button
                                key={thread.userId}
                                onClick={() => handleThreadClick(thread)}
                                className={`w-full p-4 flex items-start gap-3 rounded-xl transition-all hover:bg-white/80 text-left mb-1 ${activeThread?.userId === thread.userId
                                    ? 'bg-white border-2 border-[var(--soup-turquoise)]/30 shadow-sm'
                                    : 'border-2 border-transparent'
                                    }`}
                            >
                                <div className="relative flex-shrink-0">
                                    {thread.userAvatar ? (
                                        <img src={thread.userAvatar} className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--soup-turquoise)]/20 to-[var(--soup-pink)]/20 flex items-center justify-center text-[var(--soup-dark)] font-bold text-lg">
                                            {thread.userName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {!thread.isLastFromAdmin && (
                                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--soup-pink)] border-2 border-[var(--soup-linen)] animate-pulse" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-2 mb-0.5">
                                        <h3 className="font-black text-[var(--soup-dark)] truncate text-sm">{thread.userName}</h3>
                                        <span className="text-[10px] font-bold text-[var(--soup-dark)]/40 flex-shrink-0">
                                            {new Date(thread.lastMessageTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className={`text-xs truncate font-medium ${!thread.isLastFromAdmin ? 'text-[var(--soup-dark)] font-bold' : 'text-[var(--soup-dark)]/60'}`}>
                                        {thread.isLastFromAdmin && <span className="text-[var(--soup-turquoise)]">You: </span>}
                                        {thread.lastMessage}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className={`flex-1 flex flex-col bg-[var(--soup-linen)]/30 ${activeThread ? 'flex' : 'hidden lg:flex'}`}>
                {activeThread ? (
                    <>
                        {/* Chat header */}
                        <div className="p-4 border-b border-[var(--soup-turquoise)]/10 flex items-center justify-between bg-white/90 backdrop-blur-sm z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveThread(null)}
                                    className="lg:hidden p-2 rounded-full hover:bg-[var(--soup-turquoise)]/10 text-[var(--soup-dark)] transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                    {activeThread.userAvatar ? (
                                        <img src={activeThread.userAvatar} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-[var(--soup-dark)]/70 bg-[var(--soup-turquoise)]/10">
                                            {activeThread.userName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-black text-[var(--soup-dark)] text-base">{activeThread.userName}</h2>
                                    <p className="text-xs font-bold text-[var(--soup-dark)]/50">chat with you 24/7</p>
                                </div>
                            </div>
                            <button
                                onClick={() => loadMessages(activeThread.userId)}
                                className="p-2 rounded-full text-[var(--soup-dark)]/40 hover:text-[var(--soup-turquoise)] hover:bg-[var(--soup-turquoise)]/10 transition-all"
                                title="Refresh"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, index) => {
                                const isAdmin = msg.from_admin;
                                return (
                                    <div key={msg.id || index} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] group flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                            <div
                                                className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed relative group/msg ${isAdmin
                                                    ? 'bg-[var(--soup-turquoise)] text-white rounded-br-md shadow-md shadow-[var(--soup-turquoise)]/20'
                                                    : 'bg-white text-[var(--soup-dark)] border border-[var(--soup-turquoise)]/10 rounded-bl-md shadow-sm'
                                                    }`}
                                            >
                                                {msg.content}
                                                {!isAdmin && !msg.is_ticket && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handlePromoteToTicket(msg);
                                                        }}
                                                        className="absolute -right-14 top-1/2 -translate-y-1/2 p-1.5 bg-white text-[10px] font-black uppercase tracking-wider text-[var(--soup-pink)] border border-black/5 rounded-lg shadow-sm opacity-0 group-hover/msg:opacity-100 transition-all hover:scale-105 whitespace-nowrap"
                                                        title="Promote to ticket"
                                                    >
                                                        ticket
                                                    </button>
                                                )}
                                                {msg.is_ticket && (
                                                    <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-sm" title="Promoted to ticket">🎫</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-[var(--soup-dark)]/40 mt-1 px-1 font-medium">
                                                {formatTime(msg.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-[var(--soup-turquoise)]/10 bg-white/80 backdrop-blur-sm">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={`Reply to ${activeThread.userName}...`}
                                    className="flex-1 px-4 py-3 bg-[var(--soup-linen)]/60 border border-[var(--soup-turquoise)]/10 rounded-xl font-medium text-[var(--soup-dark)] placeholder:text-[var(--soup-dark)]/40 focus:ring-2 focus:ring-[var(--soup-turquoise)]/20 focus:border-[var(--soup-turquoise)]/30 focus:bg-white transition-all"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim() || sending}
                                    className="px-5 py-3 bg-[var(--soup-turquoise)] text-white rounded-xl font-black hover:bg-[var(--soup-turquoise)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-[var(--soup-turquoise)]/20 active:scale-95"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--soup-turquoise)]/20 to-[var(--soup-pink)]/20 flex items-center justify-center mb-6">
                            <MessageCircle size={40} className="text-[var(--soup-turquoise)]/60" />
                        </div>
                        <p className="font-black text-[var(--soup-dark)] text-lg max-w-xs">
                            You're here 24/7. They'll get a notification when you reply. You get one when they message.
                        </p>
                        <p className="text-sm font-bold text-[var(--soup-dark)]/60 mt-2 max-w-xs">
                            Pick a conversation and reply. You won't forget. They feel heard.
                        </p>
                        {responseTimeMinutes != null && (
                            <p className="text-sm font-bold text-[var(--soup-turquoise)] mt-3">
                                You usually reply in {formatResponseTime(responseTimeMinutes)}.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
