import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import LiveFeedTab from './LiveFeedTab';
import QueueTab from './QueueTab';
import { getDeepLLangCode, getGoogleLangCode } from './languageUtils';
import { translateText } from './translationHelper';

// Official Language Soup Bot ID (Fixed UUID)
const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';

export default function ChallengesTab({ user }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [challengeText, setChallengeText] = useState('');
    const [lastChallengeText, setLastChallengeText] = useState(() => {
        return localStorage.getItem('lastChallengeText') || '';
    });
    const [translating, setTranslating] = useState(false);

    const [activeView, setActiveView] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('view') || 'send';
    });

    const handleViewChange = (newView) => {
        setActiveView(newView);
        const url = new URL(window.location);
        url.searchParams.set('view', newView);
        window.history.pushState({}, '', url);
    };


    useEffect(() => {
        loadGroupsWithChallenges();
    }, []);


    const loadGroupsWithChallenges = async () => {
        try {
            const { data: groupsData } = await supabase
                .from('app_groups')
                .select('id, name, language, level, member_count')
                .order('member_count', { ascending: false });

            // Exclude DMs — challenges should never be sent to DM group chats
            const groupsOnly = (groupsData || []).filter((g) => g.name !== 'DM');

            const groupsWithData = await Promise.all(
                groupsOnly.map(async (group) => {
                    const { data: lastChallenge } = await supabase
                        .from('app_challenges')
                        .select('created_at, id, created_by')
                        .eq('group_id', group.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    let responseCount = 0;
                    if (lastChallenge) {
                        const { data: responses } = await supabase
                            .from('app_messages')
                            .select('sender_id')
                            .eq('challenge_id', lastChallenge.id);

                        const uniqueResponders = new Set(
                            responses?.filter(r => r.sender_id !== lastChallenge.created_by).map(r => r.sender_id) || []
                        );
                        responseCount = uniqueResponders.size;
                    }

                    const daysSinceChallenge = lastChallenge
                        ? Math.floor((Date.now() - new Date(lastChallenge.created_at)) / (1000 * 60 * 60 * 24))
                        : 999;

                    const needsAttention = daysSinceChallenge >= 3;

                    const responseRate = group.member_count > 0
                        ? (responseCount / group.member_count) * 100
                        : 0;

                    return {
                        ...group,
                        lastChallengeDate: lastChallenge?.created_at,
                        daysSinceChallenge,
                        responseCount,
                        responseRate,
                        needsAttention,
                    };
                })
            );

            setGroups(groupsWithData);
        } catch (err) {
            console.error('Error loading groups:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendChallenge = async () => {
        if (!challengeText.trim() || selectedGroups.length === 0) {
            alert('Please enter challenge text and select at least one group');
            return;
        }

        if (!user?.id) {
            alert('Admin user session not found. Please refresh.');
            return;
        }

        setSending(true);
        try {
            for (const groupId of selectedGroups) {
                // Just insert the challenge - the database trigger handles:
                // 1. Creating the message from the bot
                // 2. Sending notifications to group members
                const { error: challengeError } = await supabase
                    .from('app_challenges')
                    .insert({
                        group_id: groupId,
                        prompt_text: challengeText.trim(),
                        created_by: user.id,
                    });

                if (challengeError) throw challengeError;

                // Send notifications (client-side for Expo Go compatibility)
                const { data: members } = await supabase
                    .from('app_group_members')
                    .select('user_id')
                    .eq('group_id', groupId);

                if (members?.length > 0) {
                    const userIds = members.map(m => m.user_id).filter(id => id !== user.id);

                    if (userIds.length > 0) {
                        const { data: tokens } = await supabase
                            .from('app_push_tokens')
                            .select('expo_push_token')
                            .in('user_id', userIds);

                        if (tokens?.length > 0) {
                            const group = groups.find(g => g.id === groupId);
                            const randomEmojis = ['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'];
                            const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

                            const pushMessages = tokens.map(t => ({
                                to: t.expo_push_token,
                                sound: 'default',
                                title: 'mmm goood soup!',
                                body: `${randomEmoji} new challenge in ${group?.name || 'your group'}`,
                                data: { type: 'challenge', groupId: groupId }
                            }));

                            console.log(`📤 Sending ${pushMessages.length} notifications`);

                            await fetch('https://exp.host/--/api/v2/push/send', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(pushMessages),
                            });
                        }
                    }
                }
            }

            // Save the English text (before any translations) for reuse
            const englishText = challengeText.split('\n\n')[0]; // Get first part before translations
            localStorage.setItem('lastChallengeText', englishText);
            setLastChallengeText(englishText);

            alert(`Challenge sent to ${selectedGroups.length} squads! 🚀`);
            setShowModal(false);
            setChallengeText('');
            setSelectedGroups([]);
            loadGroupsWithChallenges();
        } catch (err) {
            console.error('Error sending challenge:', err);
            alert('Failed to send challenge: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    const getDeepLLangCode = (groupLanguage) => {
        const lang = groupLanguage.toLowerCase();
        // European languages
        if (lang.includes('spanish') || lang.includes('español')) return 'ES';
        if (lang.includes('french') || lang.includes('français')) return 'FR';
        if (lang.includes('italian') || lang.includes('italiano')) return 'IT';
        if (lang.includes('german') || lang.includes('deutsch')) return 'DE';
        if (lang.includes('portuguese') || lang.includes('português')) return 'PT';
        if (lang.includes('dutch') || lang.includes('nederlands')) return 'NL';
        if (lang.includes('danish') || lang.includes('dansk')) return 'DA';
        if (lang.includes('swedish') || lang.includes('svenska')) return 'SV';
        if (lang.includes('norwegian') || lang.includes('norsk')) return 'NB'; // Norwegian Bokmål
        if (lang.includes('finnish') || lang.includes('suomi')) return 'FI';
        if (lang.includes('polish') || lang.includes('polski')) return 'PL';
        if (lang.includes('czech') || lang.includes('čeština')) return 'CS';
        if (lang.includes('greek') || lang.includes('ελληνικά')) return 'EL';
        if (lang.includes('hungarian') || lang.includes('magyar')) return 'HU';
        if (lang.includes('romanian') || lang.includes('română')) return 'RO';
        if (lang.includes('bulgarian') || lang.includes('български')) return 'BG';
        if (lang.includes('slovak') || lang.includes('slovenčina')) return 'SK';
        if (lang.includes('slovenian') || lang.includes('slovenščina')) return 'SL';
        if (lang.includes('estonian') || lang.includes('eesti')) return 'ET';
        if (lang.includes('latvian') || lang.includes('latviešu')) return 'LV';
        if (lang.includes('lithuanian') || lang.includes('lietuvių')) return 'LT';

        // Asian languages
        if (lang.includes('russian') || lang.includes('русский')) return 'RU';
        if (lang.includes('japanese') || lang.includes('日本語')) return 'JA';
        if (lang.includes('chinese') || lang.includes('中文') || lang.includes('mandarin')) return 'ZH';
        if (lang.includes('korean') || lang.includes('한국어')) return 'KO';
        if (lang.includes('indonesian') || lang.includes('bahasa')) return 'ID';
        if (lang.includes('turkish') || lang.includes('türkçe')) return 'TR';
        if (lang.includes('arabic') || lang.includes('العربية')) return 'AR';

        // Note: DeepL doesn't support all languages. If null, will fallback to Google
        return null;
    };

    const getGoogleLangCode = (groupLanguage) => {
        const lang = groupLanguage.toLowerCase();
        // European languages
        if (lang.includes('spanish') || lang.includes('español')) return 'es';
        if (lang.includes('french') || lang.includes('français')) return 'fr';
        if (lang.includes('italian') || lang.includes('italiano')) return 'it';
        if (lang.includes('german') || lang.includes('deutsch')) return 'de';
        if (lang.includes('portuguese') || lang.includes('português')) return 'pt';
        if (lang.includes('dutch') || lang.includes('nederlands')) return 'nl';
        if (lang.includes('danish') || lang.includes('dansk')) return 'da';
        if (lang.includes('swedish') || lang.includes('svenska')) return 'sv';
        if (lang.includes('norwegian') || lang.includes('norsk')) return 'no';
        if (lang.includes('finnish') || lang.includes('suomi')) return 'fi';
        if (lang.includes('polish') || lang.includes('polski')) return 'pl';
        if (lang.includes('czech') || lang.includes('čeština')) return 'cs';
        if (lang.includes('greek') || lang.includes('ελληνικά')) return 'el';
        if (lang.includes('hungarian') || lang.includes('magyar')) return 'hu';
        if (lang.includes('romanian') || lang.includes('română')) return 'ro';
        if (lang.includes('bulgarian') || lang.includes('български')) return 'bg';
        if (lang.includes('slovak') || lang.includes('slovenčina')) return 'sk';
        if (lang.includes('slovenian') || lang.includes('slovenščina')) return 'sl';
        if (lang.includes('estonian') || lang.includes('eesti')) return 'et';
        if (lang.includes('latvian') || lang.includes('latviešu')) return 'lv';
        if (lang.includes('lithuanian') || lang.includes('lietuvių')) return 'lt';
        if (lang.includes('croatian') || lang.includes('hrvatski')) return 'hr';
        if (lang.includes('serbian') || lang.includes('српски')) return 'sr';
        if (lang.includes('ukrainian') || lang.includes('українська')) return 'uk';

        // Asian languages
        if (lang.includes('russian') || lang.includes('русский')) return 'ru';
        if (lang.includes('japanese') || lang.includes('日本語')) return 'ja';
        if (lang.includes('chinese') || lang.includes('中文')) return 'zh-CN';
        if (lang.includes('mandarin')) return 'zh-CN';
        if (lang.includes('cantonese')) return 'zh-TW'; // Traditional Chinese for Cantonese
        if (lang.includes('korean') || lang.includes('한국어')) return 'ko';
        if (lang.includes('indonesian') || lang.includes('bahasa')) return 'id';
        if (lang.includes('turkish') || lang.includes('türkçe')) return 'tr';
        if (lang.includes('arabic') || lang.includes('العربية')) return 'ar';
        if (lang.includes('hindi') || lang.includes('हिन्दी')) return 'hi';
        if (lang.includes('vietnamese') || lang.includes('tiếng việt')) return 'vi';
        if (lang.includes('thai') || lang.includes('ไทย')) return 'th';
        if (lang.includes('malay') || lang.includes('melayu')) return 'ms';
        if (lang.includes('tagalog') || lang.includes('filipino')) return 'tl';

        // African languages
        if (lang.includes('swahili') || lang.includes('kiswahili')) return 'sw';
        if (lang.includes('yoruba')) return 'yo';
        if (lang.includes('zulu')) return 'zu';
        if (lang.includes('afrikaans')) return 'af';

        // Other languages
        if (lang.includes('hebrew') || lang.includes('עברית')) return 'iw';
        if (lang.includes('persian') || lang.includes('فارسی') || lang.includes('farsi')) return 'fa';
        if (lang.includes('urdu') || lang.includes('اردو')) return 'ur';
        if (lang.includes('galician') || lang.includes('galego')) return 'gl';

        return null;
    };

    const handleTranslate = async () => {
        console.log('🔍 === TRANSLATION DEBUG START ===');
        console.log('Challenge text:', challengeText);
        console.log('Selected groups:', selectedGroups);

        if (!challengeText.trim()) {
            alert('Type some text first!');
            return;
        }
        if (selectedGroups.length === 0) {
            alert('Select a group first so I know which language to translate to!');
            return;
        }

        setTranslating(true);
        try {
            const firstGroupId = selectedGroups[0];
            const group = groups.find(g => g.id === firstGroupId);

            console.log('📍 Selected group:', group);
            console.log('🌍 Group language:', group?.language);

            // Use unified translation helper
            const translated = await translateText(
                challengeText,
                group?.language || '',
                getDeepLLangCode,
                getGoogleLangCode,
                supabase
            );

            // Special handling for Mooré to show community label
            const googleLang = getGoogleLangCode(group?.language || '');
            if (googleLang === 'mos') {
                setChallengeText(prev => `${prev}\n\n${translated}\n\n✨ Community-powered translation`);
            } else {
                setChallengeText(prev => `${prev}\n\n${translated}`);
            }

            console.log('✅ Translation successful!');

        } catch (err) {
            console.error('❌ Translation error:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                full: err
            });
            alert('Translation failed: ' + err.message);
        } finally {
            setTranslating(false);
            console.log('🔍 === TRANSLATION DEBUG END ===');
        }
    };

    const openSendModal = (groupIds) => {
        setSelectedGroups(groupIds);
        setShowModal(true);
    };

    if (loading) {
        return <div className="text-[var(--soup-dark)] font-bold italic animate-pulse">Loading challenges... 🍜</div>;
    }

    const needsAttentionGroups = groups.filter(g => g.needsAttention);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight">Group Challenges 🍜</h2>
                    <p className="text-gray-500 font-bold mt-1">
                        {groups.length} active groups • {needsAttentionGroups.length} need attention
                    </p>
                </div>
                <button
                    onClick={() => openSendModal(groups.map(g => g.id))}
                    className="px-8 py-4 bg-[var(--soup-turquoise)] text-white rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 flex items-center gap-3"
                >
                    <Zap size={20} />
                    Send to All Groups
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => handleViewChange('send')}
                    className={`pb-4 px-2 font-bold transition-all ${activeView === 'send'
                        ? 'text-[var(--soup-turquoise)] border-b-2 border-[var(--soup-turquoise)]'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Send Challenges
                </button>
                <button
                    onClick={() => handleViewChange('queue')}
                    className={`pb-4 px-2 font-bold transition-all ${activeView === 'queue'
                        ? 'text-[var(--soup-turquoise)] border-b-2 border-[var(--soup-turquoise)]'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Challenge Queue 📅
                </button>
                <button
                    onClick={() => handleViewChange('feed')}
                    className={`pb-4 px-2 font-bold transition-all ${activeView === 'feed'
                        ? 'text-[var(--soup-turquoise)] border-b-2 border-[var(--soup-turquoise)]'
                        : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    Live Feed 🔥
                </button>
            </div>

            {activeView === 'send' ? (
                <>
                    {/* Groups Table */}
                    <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[var(--soup-beige)]/50 border-b border-black/5">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Group</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Members</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Challenge</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Engagement</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {groups.map((group) => (
                                    <tr key={group.id} className={`${group.needsAttention ? 'bg-orange-50/20' : 'hover:bg-gray-50/50'} transition-colors group`}>
                                        <td className="px-8 py-6">
                                            <div className="font-extrabold text-[var(--soup-dark)] text-lg tracking-tight group-hover:text-[var(--soup-turquoise)] transition-colors">{group.name}</div>
                                            <div className="text-sm font-bold text-gray-400">{group.language} {group.level && `• ${group.level}`}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-bold text-gray-600">{group.member_count}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {group.lastChallengeDate ? (
                                                <div>
                                                    <div className="text-sm font-bold text-[var(--soup-dark)]">
                                                        {new Date(group.lastChallengeDate).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-[10px] font-black text-[var(--soup-turquoise)] uppercase tracking-wider">
                                                        {group.daysSinceChallenge}d ago
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-bold text-gray-300 italic">No challenges</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            {group.lastChallengeDate ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[var(--soup-turquoise)]"
                                                            style={{ width: `${Math.min(100, group.responseRate)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--soup-dark)]">{Math.round(group.responseRate)}%</span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            {group.needsAttention ? (
                                                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                                                    <AlertCircle size={14} />
                                                    Needs Attention
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-[var(--soup-green)] text-[10px] font-black rounded-full uppercase tracking-wider">
                                                    <CheckCircle size={14} />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => openSendModal([group.id])}
                                                className="px-6 py-2.5 text-sm font-bold text-[var(--soup-turquoise)] hover:bg-[var(--soup-turquoise)] hover:text-white rounded-xl transition-all active:scale-95 border-2 border-[var(--soup-turquoise)]/10 hover:border-[var(--soup-turquoise)]"
                                            >
                                                Send Challenge
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Send Challenge Modal */}
                    {showModal && (
                        <div className="fixed inset-0 bg-[var(--soup-dark)]/40 backdrop-blur-md flex items-center justify-center p-6 z-50 animate-in fade-in duration-300">
                            <div className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full p-10 transform animate-in zoom-in-95 duration-300">
                                <h3 className="text-4xl font-black text-[var(--soup-dark)] tracking-tighter mb-2">
                                    {selectedGroups.length === 1
                                        ? groups.find(g => g.id === selectedGroups[0])?.name || 'Challenge'
                                        : selectedGroups.length === groups.length
                                            ? 'All Groups 🍜'
                                            : `${selectedGroups.length} Groups`
                                    }
                                </h3>
                                <p className="text-gray-500 font-bold mb-8">
                                    {selectedGroups.length === 1
                                        ? `Sending to ${groups.find(g => g.id === selectedGroups[0])?.language || 'group'}`
                                        : `Sending to ${selectedGroups.length} groups`
                                    }
                                </p>

                                <div className="mb-8">
                                    {lastChallengeText && (
                                        <button
                                            onClick={() => setChallengeText(lastChallengeText)}
                                            className="mb-4 text-sm bg-[var(--soup-beige)] text-[var(--soup-dark)] hover:bg-[var(--soup-turquoise)] hover:text-white font-black flex items-center gap-2 transition-all px-5 py-2.5 rounded-xl active:scale-95 border border-black/5"
                                        >
                                            📋 Copy Last Challenge Text
                                        </button>
                                    )}

                                    <button
                                        onClick={handleTranslate}
                                        disabled={translating || !challengeText.trim()}
                                        className="mb-4 text-sm bg-white shadow-md border border-black/5 text-[var(--soup-turquoise)] hover:bg-[var(--soup-turquoise)] hover:text-white font-black flex items-center gap-2 transition-all px-6 py-3 rounded-xl active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {translating ? (
                                            <>
                                                <Clock size={16} className="animate-spin" />
                                                Translating...
                                            </>
                                        ) : (
                                            <>
                                                ✨ AI Translate
                                            </>
                                        )}
                                    </button>

                                    <textarea
                                        value={challengeText}
                                        onChange={(e) => setChallengeText(e.target.value)}
                                        placeholder="What's the challenge today?&#10;&#10;¿Cuál es el desafío de hoy?"
                                        className="w-full px-8 py-8 bg-[var(--soup-beige)]/30 border-2 border-transparent focus:border-[var(--soup-turquoise)]/30 focus:bg-white rounded-[24px] focus:ring-0 text-xl font-bold min-h-[220px] transition-all"
                                        rows={6}
                                    />
                                </div>

                                <div className="flex gap-4 justify-end">
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            setChallengeText('');
                                        }}
                                        className="px-8 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                                        disabled={sending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendChallenge}
                                        disabled={sending || !challengeText.trim()}
                                        className="px-10 py-4 bg-[var(--soup-turquoise)] text-white rounded-[20px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--soup-turquoise)]/20 disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {sending ? (
                                            <>
                                                <Clock size={20} className="animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={20} />
                                                Send Challenge 🚀
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : activeView === 'queue' ? (
                <QueueTab
                    user={user}
                    groups={groups}
                    getDeepLLangCode={getDeepLLangCode}
                    getGoogleLangCode={getGoogleLangCode}
                />
            ) : (
                <LiveFeedTab />
            )
            }
        </div >
    );
}
