import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Send, Bell, CheckCircle, Zap, Clock } from 'lucide-react';

// Official Language Soup Bot ID (Fixed UUID)
const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';

export default function AnnouncementsTab() {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [lastSent, setLastSent] = useState(null);

    const handlePostAnnouncement = async () => {
        if (!message.trim()) {
            alert('Please type a message first.');
            return;
        }

        setSending(true);
        try {
            // Post to Community chat
            const { data: communityGroup } = await supabase
                .from('app_groups')
                .select('id')
                .eq('name', 'Community') // Checking by name as well just in case
                .limit(1)
                .single();

            // If name check fails, try language check
            let targetGroupId = communityGroup?.id;
            if (!targetGroupId) {
                const { data: communityLang } = await supabase
                    .from('app_groups')
                    .select('id')
                    .eq('language', 'Community')
                    .limit(1)
                    .single();
                targetGroupId = communityLang?.id;
            }

            if (!targetGroupId) {
                throw new Error('Could not find the Community group.');
            }

            // Insert announcement message from the BOT
            const { error } = await supabase
                .from('app_messages')
                .insert({
                    group_id: targetGroupId,
                    content: `📢 **ANNOUNCEMENT**\n\n${message.trim()}`,
                    message_type: 'text',
                    sender_id: SYSTEM_BOT_ID,
                });

            if (error) throw error;

            // Trigger Push Notification via Edge Function
            supabase.functions.invoke('send-push-notification', {
                body: {
                    record: {
                        id: 'announcement-' + Date.now(),
                        group_id: targetGroupId,
                        prompt_text: `📢 ${message.slice(0, 100)}...`
                    },
                    isAnnouncement: true
                }
            }).catch(err => console.error('Notification error (ignoring):', err));

            alert('Announcement sent to the community! 🚀');
            setLastSent(new Date());
            setMessage('');
        } catch (err) {
            console.error('Error posting announcement:', err);
            alert(`Failed: ${err.message}`);
        } finally {
            setSending(false);
        }
    };

    const generateWeeklyUpdate = () => {
        const template = `🍜 The Weekly Update!

📊 Stats:
• Soupers in the soup: [NUMBER]
• Active groups: [GROUPS]
• Total talking: [NUMBER] mins

🚀 New Features:
• [NEW FEATURE]

🎉 Highlight of the Week:
• [USER] for being excellent at [LANGUAGE]

Visit the "Support" tab if you need anything!
Keep cooking 😎`;

        setMessage(template);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight">Announcements 📢</h2>
                    <p className="text-gray-500 font-bold mt-1">
                        Send news to the entire community
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats & Quick Actions */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[var(--soup-beige)]/30 p-8 rounded-[32px] border border-black/5">
                        <Zap className="text-[var(--soup-turquoise)] mb-4" size={32} />
                        <h4 className="text-xl font-black text-[var(--soup-dark)] mb-2">Instant Reach</h4>
                        <p className="text-gray-500 font-bold text-sm leading-relaxed">
                            Every single person in the Community group will see this message immediately.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-50 rounded-2xl">
                                <CheckCircle className="text-[var(--soup-green)]" size={24} />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</div>
                                <div className="font-bold text-[var(--soup-dark)]">
                                    {lastSent ? `Last sent ${lastSent.toLocaleDateString()}` : 'Ready to post'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={generateWeeklyUpdate}
                            className="w-full py-4 bg-gray-50 text-gray-700 rounded-xl font-black hover:bg-gray-100 transition active:scale-95 flex items-center justify-center gap-2 border border-black/5"
                        >
                            📝 Use Weekly Update Template
                        </button>
                    </div>
                </div>

                {/* Composer */}
                <div className="lg:col-span-2">
                    <div className="bg-white p-10 rounded-[32px] border border-black/5 shadow-sm">
                        <div className="relative group mb-6">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Write your announcement here...&#10;&#10;e.g. 🎉 We just hit 1k Soupers!"
                                className="w-full px-8 py-8 bg-[var(--soup-beige)]/30 border-2 border-transparent focus:border-[var(--soup-turquoise)]/30 focus:bg-white rounded-[24px] focus:ring-0 text-xl font-bold min-h-[350px] transition-all"
                            />
                            <div className="absolute top-6 right-8 px-4 py-2 bg-white/50 rounded-full border border-black/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                {message.length} chars
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handlePostAnnouncement}
                                disabled={sending || !message.trim()}
                                className="px-12 py-5 bg-[var(--soup-turquoise)] text-white rounded-[20px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 disabled:opacity-50 flex items-center gap-4"
                            >
                                {sending ? (
                                    <>
                                        <Clock size={24} className="animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={24} />
                                        Send Announcement 🚀
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Best Practices */}
            <div className="mt-12 bg-white border border-black/5 rounded-[32px] p-8 flex gap-6 items-start shadow-sm">
                <div className="p-4 bg-[var(--soup-beige)]/50 rounded-2xl">
                    <Bell className="text-[var(--soup-turquoise)]" size={24} />
                </div>
                <div>
                    <h5 className="font-black text-[var(--soup-dark)] mb-2">Best Practices 🍜</h5>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm font-bold text-gray-500">
                        <li>• Keep it short so it stays engaging</li>
                        <li>• Use emojis to increase engagement</li>
                        <li>• Post weekly updates for consistency</li>
                        <li>• Highlight user achievements to build community</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
