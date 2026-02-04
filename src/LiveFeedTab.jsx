import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Play, Pause } from 'lucide-react';

export default function LiveFeedTab() {
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const [feedbackStats, setFeedbackStats] = useState({ positive: 0, negative: 0, total: 0 });
    const audioRef = useRef(new Audio());

    useEffect(() => {
        loadResponses();
        const interval = setInterval(loadResponses, 10000); // Refresh every 10s

        // Cleanup audio on unmount
        return () => {
            clearInterval(interval);
            audioRef.current.pause();
            audioRef.current.src = '';
        };
    }, []);

    const handlePlayAudio = (url, id) => {
        if (currentlyPlaying === id) {
            audioRef.current.pause();
            setCurrentlyPlaying(null);
            return;
        }

        // Stop any current audio
        audioRef.current.pause();

        // Play new audio
        audioRef.current.src = url;
        audioRef.current.play().catch(e => console.error("Error playing audio:", e));
        setCurrentlyPlaying(id);

        // Reset when done
        audioRef.current.onended = () => setCurrentlyPlaying(null);
    };

    const loadResponses = async () => {
        try {
            const { data } = await supabase
                .from('app_messages')
                .select(`
                    id,
                    content,
                    media_url,
                    message_type,
                    created_at,
                    sender:app_users!app_messages_sender_id_fkey(display_name, avatar_url),
                    group:app_groups!app_messages_group_id_fkey(name)
                `)
                .neq('message_type', 'system') // Filter out system messages
                .order('created_at', { ascending: false })
                .limit(50);

            setResponses(data || []);
        } catch (err) {
            console.error('Error loading responses:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFeedbackStats = async () => {
        try {
            const { data, error } = await supabase
                .from('app_feature_feedback')
                .select('rating')
                .eq('feature_name', 'voice_correct_me');

            if (data) {
                const positive = data.filter(r => r.rating === 5).length;
                const negative = data.filter(r => r.rating === 1).length;
                setFeedbackStats({
                    positive,
                    negative,
                    total: data.length
                });
            }
        } catch (err) {
            console.error('Error loading feedback stats:', err);
        }
    };

    useEffect(() => {
        loadFeedbackStats();
        const interval = setInterval(loadFeedbackStats, 30000); // Check stats every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-400">Loading feed...</div>;

    return (
        <div className="space-y-4">
            {/* Voice Feedback Pulse Card */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 opacity-90">
                            <span className="text-xl">✨</span>
                            <span className="font-bold text-sm tracking-widest uppercase">Voice Feedback Pulse</span>
                        </div>
                        <div className="flex items-end gap-1 mb-2">
                            <span className="text-4xl font-black">{feedbackStats.total}</span>
                            <span className="text-sm font-medium opacity-80 mb-1">ratings</span>
                        </div>
                        <div className="flex gap-2 text-xs font-bold">
                            <div className="bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                <span>👍</span> {feedbackStats.positive}
                            </div>
                            <div className="bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1">
                                <span>👎</span> {feedbackStats.negative}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-sm font-bold text-gray-400 mb-4">Latest responses across all groups</div>
            {responses.map((response) => (
                <div key={response.id} className="bg-white p-4 rounded-xl border border-black/5 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                        {response.sender?.avatar_url ? (
                            <img src={response.sender.avatar_url} className="w-10 h-10 rounded-full" alt="" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                {response.sender?.display_name?.charAt(0) || '?'}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-[var(--soup-dark)]">{response.sender?.display_name || 'Unknown'}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs font-bold text-[var(--soup-turquoise)]">{response.group?.name || 'Unknown'}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-400">{new Date(response.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            {response.message_type === 'audio' || (response.media_url && !response.content) ? (
                                <button
                                    onClick={() => handlePlayAudio(response.media_url, response.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all border ${currentlyPlaying === response.id
                                        ? 'bg-[var(--soup-turquoise)] border-[var(--soup-turquoise)] text-white shadow-md'
                                        : 'bg-white border-gray-100 text-gray-500 hover:border-[var(--soup-turquoise)] hover:text-[var(--soup-turquoise)]'
                                        }`}
                                >
                                    <div className="flex items-center justify-center w-8 h-8 bg-black/10 rounded-full">
                                        {currentlyPlaying === response.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                    </div>

                                    {currentlyPlaying === response.id ? (
                                        <div className="flex items-center gap-1 h-4">
                                            {/* Animated Waveform Bars */}
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1 bg-white rounded-full animate-pulse"
                                                    style={{
                                                        height: `${Math.random() * 100}%`,
                                                        animationDuration: `${0.5 + Math.random() * 0.5}s`
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 h-4 opacity-50">
                                            {/* Static Waveform Bars */}
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="w-1 bg-current rounded-full"
                                                    style={{ height: [40, 70, 50, 80, 40][i] + '%' }}
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <span className="text-xs font-bold ml-1">
                                        {currentlyPlaying === response.id ? 'Playing' : 'Voice Memo'}
                                    </span>
                                </button>
                            ) : (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.content}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
