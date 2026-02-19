/**
 * useGroupChat – Single group chat data & actions. WhatsApp-style parity.
 * One place for: load messages, realtime, send text/voice/image, reactions, read receipts.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

const DEFAULT_SENDER = { display_name: 'Deleted User', avatar_url: null, fluent_languages: [] };

function addDateSeparators(messages) {
    if (!messages?.length) return [];
    const result = [];
    let lastDate = null;
    messages.forEach((msg) => {
        const msgDate = new Date(msg.created_at).toDateString();
        if (msgDate !== lastDate) {
            const date = new Date(msg.created_at);
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();
            let label = 'Today';
            if (msgDate === yesterday) label = 'Yesterday';
            else if (msgDate !== today) {
                label = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            }
            result.push({ id: `date-${msg.created_at}`, type: 'date_separator', label });
            lastDate = msgDate;
        }
        result.push(msg);
    });
    return result;
}

export function useGroupChat(groupId, userId, options = {}) {
    const { currentChallengeId } = options;
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [group, setGroup] = useState(null);
    const [reactions, setReactions] = useState({});
    const [groupMembersReadAt, setGroupMembersReadAt] = useState([]);
    const channelRef = useRef(null);
    const listRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    }, []);

    const loadReactions = useCallback(async (messageIds) => {
        if (!messageIds?.length) return;
        try {
            const { data, error } = await supabase
                .from('app_message_reactions')
                .select('*')
                .in('message_id', messageIds);
            if (error) return;
            const map = {};
            (data || []).forEach((r) => {
                if (!map[r.message_id]) map[r.message_id] = [];
                map[r.message_id].push(r);
            });
            setReactions((prev) => ({ ...prev, ...map }));
        } catch (_) {}
    }, []);

    const load = useCallback(async () => {
        const gid = typeof groupId === 'string' ? groupId : groupId != null ? String(groupId) : null;
        if (!gid || !userId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [{ data: groupData }, { data: messagesData, error: msgError }] = await Promise.all([
                supabase.from('app_groups').select('name, member_count, language, avatar_url').eq('id', gid).single(),
                supabase
                    .from('app_messages')
                    .select(`*, sender:app_users(id, display_name, avatar_url, fluent_languages, learning_languages, status_text)`)
                    .eq('group_id', gid)
                    .order('created_at', { ascending: false })
                    .limit(100),
            ]);
            if (groupData) {
                const isDM = groupData.name === 'DM' && groupData.member_count === 2;
                if (isDM) {
                    const { data: members } = await supabase
                        .from('app_group_members')
                        .select('user_id, app_users(id, display_name, avatar_url)')
                        .eq('group_id', gid)
                        .neq('user_id', userId)
                        .limit(1);
                    const partner = members?.[0]?.app_users;
                    const p = Array.isArray(partner) ? partner[0] : partner;
                    setGroup({
                        name: p?.display_name || 'Direct Message',
                        avatar_url: p?.avatar_url ?? groupData.avatar_url,
                        member_count: groupData.member_count,
                        language: groupData.language || '',
                    });
                } else {
                    setGroup({
                        name: groupData.name,
                        avatar_url: groupData.avatar_url,
                        member_count: groupData.member_count || 0,
                        language: groupData.language || '',
                    });
                }
            }
            if (msgError) throw msgError;
            const list = (messagesData || []).slice(0).reverse();
            const withSender = list.map((msg) => ({
                ...msg,
                sender: msg.sender || DEFAULT_SENDER,
            }));
            setMessages(withSender);

            const ids = withSender.map((m) => m.id);
            if (ids.length > 0) await loadReactions(ids);

            const { data: readData } = await supabase
                .from('app_group_members')
                .select('user_id, last_read_at')
                .eq('group_id', gid);
            setGroupMembersReadAt(readData || []);
        } catch (e) {
            console.error('[useGroupChat] load:', e);
        } finally {
            setLoading(false);
        }
    }, [groupId, userId, loadReactions]);

    useEffect(() => {
        load();
    }, [load]);

    // Realtime: all messages for this group (no challenge filter for WhatsApp parity)
    useEffect(() => {
        const gid = typeof groupId === 'string' ? groupId : groupId != null ? String(groupId) : null;
        if (!gid || !userId) return;
        const channel = supabase
            .channel(`group-chat-${gid}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'app_messages',
                    filter: `group_id=eq.${gid}`,
                },
                async (payload) => {
                    if (payload.new.sender_id === userId) return;
                    const { data: row } = await supabase
                        .from('app_messages')
                        .select(`*, sender:app_users(id, display_name, avatar_url, fluent_languages, status_text)`)
                        .eq('id', payload.new.id)
                        .single();
                    if (row) {
                        const msg = { ...row, sender: row.sender || DEFAULT_SENDER };
                        setMessages((prev) => [...prev, msg]);
                        setTimeout(() => listRef.current?.scrollToOffset?.({ offset: 0, animated: true }), 80);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'app_messages',
                    filter: `group_id=eq.${gid}`,
                },
                (payload) => {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
                    );
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'app_message_reactions' },
                (payload) => {
                    const mid = payload.new.message_id;
                    setReactions((prev) => ({
                        ...prev,
                        [mid]: [...(prev[mid] || []).filter((r) => !(String(r.id).startsWith('opt-') && r.user_id === payload.new.user_id && r.emoji === payload.new.emoji)), payload.new],
                    }));
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'app_message_reactions' },
                (payload) => {
                    const mid = payload.old.message_id;
                    setReactions((prev) => ({
                        ...prev,
                        [mid]: (prev[mid] || []).filter((r) => r.id !== payload.old.id),
                    }));
                }
            )
            .subscribe();
        channelRef.current = channel;
        return () => {
            supabase.removeChannel(channel);
        };
    }, [groupId, userId]);

    const sendText = useCallback(
        async (text, { challengeId = currentChallengeId } = {}) => {
            if (!text?.trim() || !userId || !groupId) return;
            const tempId = `temp-${Date.now()}`;
            const optimistic = {
                id: tempId,
                sender_id: userId,
                group_id: groupId,
                challenge_id: challengeId || null,
                message_type: 'text',
                content: text.trim(),
                created_at: new Date().toISOString(),
                status: 'sending',
                sender: { display_name: 'Me' },
            };
            setMessages((prev) => [...prev, optimistic]);
            setTimeout(scrollToBottom, 50);
            try {
                const { data, error } = await supabase
                    .from('app_messages')
                    .insert({
                        sender_id: userId,
                        group_id: groupId,
                        challenge_id: challengeId || null,
                        message_type: 'text',
                        content: text.trim(),
                    })
                    .select()
                    .single();
                if (error) throw error;
                await supabase
                    .from('app_group_members')
                    .update({ last_read_at: new Date().toISOString() })
                    .eq('user_id', userId)
                    .eq('group_id', groupId);
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data, sender: optimistic.sender } : m)));
            } catch (err) {
                console.error('[useGroupChat] sendText:', err);
                Alert.alert('Message Failed', 'Could not send. Check your connection and try again.', [{ text: 'OK' }]);
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
                throw err;
            }
        },
        [groupId, userId, currentChallengeId, scrollToBottom]
    );

    const sendVoice = useCallback(
        async (audioUri, durationSeconds, { challengeId = currentChallengeId } = {}) => {
            if (!audioUri || !userId || !groupId) return;
            const tempId = `temp-voice-${Date.now()}`;
            const duration = durationSeconds ?? 0;
            const optimistic = {
                id: tempId,
                sender_id: userId,
                group_id: groupId,
                challenge_id: challengeId || null,
                message_type: 'voice',
                media_url: audioUri,
                duration_seconds: duration,
                created_at: new Date().toISOString(),
                status: 'uploading',
                sender: { display_name: 'Me' },
            };
            setMessages((prev) => [...prev, optimistic]);
            setTimeout(scrollToBottom, 50);
            try {
                const fileInfo = await FileSystem.getInfoAsync(audioUri);
                if (!fileInfo.exists) throw new Error('Voice file not found');
                const audioData = await FileSystem.readAsStringAsync(audioUri, { encoding: FileSystem.EncodingType.Base64 });
                const fileName = `language-chat/${userId}/voice_${Date.now()}.m4a`;
                const { error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, decode(audioData), { contentType: 'audio/m4a' });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);
                const { data, error: insertError } = await supabase
                    .from('app_messages')
                    .insert({
                        sender_id: userId,
                        group_id: groupId,
                        challenge_id: challengeId || null,
                        message_type: 'voice',
                        media_url: publicUrl,
                        duration_seconds: duration,
                    })
                    .select()
                    .single();
                if (insertError) throw insertError;
                await supabase
                    .from('app_group_members')
                    .update({ last_read_at: new Date().toISOString() })
                    .eq('user_id', userId)
                    .eq('group_id', groupId);
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data, sender: optimistic.sender } : m)));
                supabase.functions.invoke('voice-feedback', { body: { task: 'transcribe_message', messageId: data.id } })
                    .then(({ data: resData }) => {
                        if (resData?.transcript) {
                            setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, transcript: resData.transcript } : m)));
                        }
                    })
                    .catch(() => {});
            } catch (err) {
                console.error('[useGroupChat] sendVoice:', err);
                const message = err?.message ? `Could not upload: ${err.message}` : 'Could not upload. Check your connection and try again.';
                Alert.alert('Voice Message Failed', message, [{ text: 'OK' }]);
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
                throw err;
            }
        },
        [groupId, userId, currentChallengeId, scrollToBottom]
    );

    const sendImage = useCallback(
        async (media, { challengeId = currentChallengeId } = {}) => {
            const uri = typeof media === 'string' ? media : media?.uri;
            const mediaType = typeof media === 'string' ? 'image' : media?.type || 'image';
            const caption = typeof media === 'string' ? '' : media?.caption || '';
            if (!uri || !userId || !groupId) return;
            const tempId = `temp-${mediaType}-${Date.now()}`;
            const optimistic = {
                id: tempId,
                sender_id: userId,
                group_id: groupId,
                challenge_id: challengeId || null,
                message_type: mediaType,
                media_url: uri,
                content: caption,
                created_at: new Date().toISOString(),
                status: 'uploading',
                sender: { display_name: 'Me' },
            };
            setMessages((prev) => [...prev, optimistic]);
            setTimeout(scrollToBottom, 50);
            try {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const extension = mediaType === 'video' ? 'mp4' : 'jpg';
                const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
                const fileName = `chat-media/${groupId}/${userId}/${mediaType}_${Date.now()}.${extension}`;
                const { error: uploadError } = await supabase.storage.from('voice-memos').upload(fileName, decode(base64), { contentType });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('voice-memos').getPublicUrl(fileName);
                const { data, error: insertError } = await supabase
                    .from('app_messages')
                    .insert({
                        sender_id: userId,
                        group_id: groupId,
                        challenge_id: challengeId || null,
                        message_type: mediaType,
                        media_url: publicUrl,
                        content: caption || null,
                    })
                    .select()
                    .single();
                if (insertError) throw insertError;
                setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data, sender: optimistic.sender } : m)));
            } catch (err) {
                console.error('[useGroupChat] sendImage:', err);
                Alert.alert(mediaType === 'video' ? 'Video Failed' : 'Image Failed', 'Could not upload. Try again.', [{ text: 'OK' }]);
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
                throw err;
            }
        },
        [groupId, userId, currentChallengeId, scrollToBottom]
    );

    const handleReact = useCallback(
        async (messageId, emoji) => {
            if (!userId) return;
            const list = reactions[messageId] || [];
            const existing = list.find((r) => r.user_id === userId && r.emoji === emoji);
            if (existing) {
                setReactions((prev) => {
                    const next = { ...prev };
                    next[messageId] = (next[messageId] || []).filter((r) => r.id !== existing.id);
                    return next;
                });
                await supabase.from('app_message_reactions').delete().eq('id', existing.id);
            } else {
                const opt = { id: `opt-${messageId}-${userId}-${emoji}`, message_id: messageId, user_id: userId, emoji, created_at: new Date().toISOString() };
                setReactions((prev) => ({
                    ...prev,
                    [messageId]: [...(prev[messageId] || []).filter((r) => !(String(r.id).startsWith('opt-') && r.user_id === userId && r.emoji === emoji)), opt],
                }));
                const { error } = await supabase.from('app_message_reactions').insert({ message_id: messageId, user_id: userId, emoji });
                if (error) {
                    setReactions((prev) => ({
                        ...prev,
                        [messageId]: (prev[messageId] || []).filter((r) => r.id !== opt.id),
                    }));
                }
            }
        },
        [userId, reactions]
    );

    const messagesWithDates = useMemo(
        () => [...addDateSeparators(messages)].reverse(),
        [messages]
    );

    return {
        messages,
        messagesWithDates,
        loading,
        group,
        reactions,
        groupMembersReadAt,
        listRef,
        scrollToBottom,
        loadReactions,
        refetch: load,
        sendText,
        sendVoice,
        sendImage,
        handleReact,
        setMessages,
    };
}
