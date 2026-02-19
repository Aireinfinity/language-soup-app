import { useState, useEffect } from 'react';
import { supabase } from './supabase';

const NOAH_USER_ID = '32ac1943-aa68-4025-b4d9-3aa7ef129fb1';
const NOAH_SUPPORT_EMAIL = 'noah@languagesoup.com';

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
                if (minutes > 0 && minutes < 60 * 24) responseTimes.push(minutes);
                lastUserAt = null;
            }
        }
    }
    if (responseTimes.length === 0) return null;
    return Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
}

function formatResponseTime(minutes) {
    if (minutes < 1) return 'under a minute';
    if (minutes < 60) return `~${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (m === 0) return `~${h} hr`;
    return `~${h}h ${m}m`;
}

const STATUS_OPTIONS = [
    { value: 'at_desk', label: 'at my desk', sub: 'online, will reply' },
    { value: 'on_the_go', label: "on the go", sub: 'checking on phone' },
    { value: 'sleeping', label: 'sleeping', sub: "will check when he's up" },
];

export default function NoahAvailabilityCard() {
    const [noahProfile, setNoahProfile] = useState(null);
    const [responseTimeMinutes, setResponseTimeMinutes] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const load = async () => {
        try {
            const [profileRes, messagesRes] = await Promise.all([
                supabase.from('app_users').select('display_name, avatar_url, availability_override').eq('id', NOAH_USER_ID).single(),
                supabase.from('app_support_messages').select('user_id, created_at, from_admin').order('created_at', { ascending: true })
            ]);
            if (profileRes.data) setNoahProfile(profileRes.data);
            if (messagesRes.data?.length) {
                const byUser = {};
                messagesRes.data.forEach(m => {
                    if (!byUser[m.user_id]) byUser[m.user_id] = [];
                    byUser[m.user_id].push(m);
                });
                const adminIds = [NOAH_USER_ID, '29864936-719c-483b-ac6a-4d06084a48fe'];
                adminIds.forEach(id => delete byUser[id]);
                const avg = computeAverageResponseTime(byUser);
                setResponseTimeMinutes(avg);
            }
        } catch (err) {
            console.error('NoahAvailabilityCard load:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const setAvailability = async (value) => {
        setUpdating(true);
        try {
            await supabase.from('app_users').update({ availability_override: value }).eq('id', NOAH_USER_ID);
            setNoahProfile(prev => prev ? { ...prev, availability_override: value } : null);
        } catch (err) {
            console.error('NoahAvailabilityCard setAvailability:', err);
        } finally {
            setUpdating(false);
        }
    };

    const current = noahProfile?.availability_override || 'on_the_go';
    const currentOption = STATUS_OPTIONS.find(o => o.value === current) || STATUS_OPTIONS[1];

    if (loading) {
        return (
            <div className="rounded-2xl bg-white border border-[var(--soup-turquoise)]/20 shadow-sm p-6 animate-pulse">
                <div className="h-24 bg-[var(--soup-linen)]/50 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white border border-[var(--soup-turquoise)]/20 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4">
                <div className="relative flex-shrink-0">
                    {noahProfile?.avatar_url ? (
                        <img src={noahProfile.avatar_url} alt="Noah" className="w-14 h-14 rounded-full object-cover border-2 border-[var(--soup-turquoise)]/30 shadow-md" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--soup-turquoise)] to-[var(--soup-green)] flex items-center justify-center shadow-md text-white font-black text-xl">N</div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--soup-green)] border-2 border-white" title="Noah's here" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-[var(--soup-dark)] text-sm lowercase">noah's here 24/7</p>
                    <p className="text-xs font-bold text-[var(--soup-dark)]/60">
                        {responseTimeMinutes != null ? `usually replies in ${formatResponseTime(responseTimeMinutes)}` : "he'll reply. you're not forgotten."}
                    </p>
                </div>
            </div>
            <div className="border-t border-[var(--soup-turquoise)]/10 px-4 py-3 bg-[var(--soup-linen)]/30">
                <p className="text-xs font-black text-[var(--soup-dark)] uppercase tracking-wide mb-1">{currentOption.label}</p>
                <p className="text-[10px] font-bold text-[var(--soup-dark)]/50 mb-3">{currentOption.sub}</p>
                <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            disabled={updating}
                            onClick={() => setAvailability(opt.value)}
                            className={`text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${current === opt.value ? 'bg-[var(--soup-turquoise)]/20 text-[var(--soup-turquoise)] border-[var(--soup-turquoise)]/30' : 'text-[var(--soup-dark)]/50 border-[var(--soup-dark)]/10 hover:bg-[var(--soup-linen)]/50'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="px-4 pb-3 pt-1">
                <p className="text-[10px] font-bold text-[var(--soup-dark)]/50">
                    They get notified when you reply. You get notified when they message. For longer stuff: <a href={`mailto:${NOAH_SUPPORT_EMAIL}`} className="text-[var(--soup-turquoise)] underline hover:no-underline">{NOAH_SUPPORT_EMAIL}</a>
                </p>
            </div>
        </div>
    );
}
