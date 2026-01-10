import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Plus, Search, Trash2, X, Check, Clock, AlertTriangle, Lightbulb } from 'lucide-react';

// Helper: Auto-generate subject line
const generateSubjectLine = (content) => {
    if (!content) return 'Support Message';
    const cleaned = content.trim().toLowerCase();

    if (cleaned.includes('crash')) return 'App Crash Issue';
    if (cleaned.includes('login')) return 'Login Problem';
    if (cleaned.includes('notification')) return 'Notification Issue';
    if (cleaned.includes('voice') || cleaned.includes('audio')) return 'Voice/Audio Issue';
    if (cleaned.includes('dark mode')) return 'Dark Mode Request';
    if (cleaned.includes('how do i')) return 'How-To Question';
    if (cleaned.includes('avatar')) return 'Avatar/Profile Issue';

    const truncated = content.substring(0, 40).trim();
    return truncated.charAt(0).toUpperCase() + truncated.slice(1) + (content.length > 40 ? '...' : '');
};

// Helper: Auto-detect category
const detectCategory = (content) => {
    if (!content) return 'bug';
    const cleaned = content.toLowerCase();
    const featureKeywords = ['suggestion', 'would be cool', 'add', 'feature', 'dark mode'];
    return featureKeywords.some(k => cleaned.includes(k)) ? 'feature_request' : 'bug';
};

// Helper: Format time ago
const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function SupportTabSimplified() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [editingTicket, setEditingTicket] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTicket, setNewTicket] = useState({ title: '', category: 'bug', isUrgent: false });
    const [draggedTicket, setDraggedTicket] = useState(null);

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('app_support_messages')
                .select('*, app_users(display_name, avatar_url)')
                .not('title', 'is', null) // Fetch all tickets (admin or user), ignore replies (no title)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const ticketsWithDefaults = (data || []).map(ticket => ({
                ...ticket,
                priority: ticket.priority || 'P2',
                status: ticket.status || 'new',
                category: ticket.category || detectCategory(ticket.content),
                title: ticket.title || generateSubjectLine(ticket.content),
                isUrgent: ticket.priority === 'P0',
            }));

            setTickets(ticketsWithDefaults);
        } catch (err) {
            console.error('Error loading tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTicket = async () => {
        if (!editingTicket) return;
        try {
            const { error } = await supabase
                .from('app_support_messages')
                .update({
                    priority: editingTicket.isUrgent ? 'P0' : 'P2',
                    status: editingTicket.status,
                    category: editingTicket.category,
                    title: editingTicket.title,
                })
                .eq('id', editingTicket.id);

            if (error) throw error;
            setShowModal(false);
            setEditingTicket(null);
            loadTickets();
        } catch (err) {
            console.error('Error saving:', err);
            alert('Failed to save');
        }
    };

    const handleDeleteTicket = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();

        if (deleting || !editingTicket) return;

        setDeleting(true);
        try {
            const { error } = await supabase
                .from('app_support_messages')
                .delete()
                .eq('id', editingTicket.id);

            if (error) throw error;

            setShowModal(false);
            setEditingTicket(null);
            await loadTickets();
        } catch (err) {
            console.error('Error deleting:', err);
            alert('Failed to delete: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    const handleCreateTicket = async () => {
        if (!newTicket.title.trim()) {
            alert('Enter a title first! 🥣');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('app_support_messages')
                .insert({
                    user_id: user.id,
                    content: newTicket.title,
                    title: newTicket.title,
                    category: newTicket.category,
                    priority: newTicket.isUrgent ? 'P0' : 'P2',
                    status: 'new',
                    from_admin: true,
                    message_type: 'text',
                });

            if (error) throw error;

            setShowCreateModal(false);
            setNewTicket({ title: '', category: 'bug', isUrgent: false });
            loadTickets();
        } catch (err) {
            console.error('Error creating:', err);
            alert('Failed to create ticket');
        }
    };

    const handleDragStart = (e, ticket) => {
        setDraggedTicket(ticket);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        if (!draggedTicket) return;

        try {
            const { error } = await supabase
                .from('app_support_messages')
                .update({ status: newStatus })
                .eq('id', draggedTicket.id);

            if (error) throw error;

            // Send auto-notification for ANY status change
            const statusMessages = {
                'new': "📬 Your support ticket has been received! We'll look into it soon.",
                'investigating': "🔍 We're investigating your issue now. Thanks for your patience!",
                'fixing': "🔧 We're working on a fix for your issue. Hang tight!",
                'fixed': "✅ Your issue has been fixed! The update should be live soon.",
                'resolved': "🎉 Your issue has been resolved! Please check to make sure everything is working. If you encounter any bugs or have feature requests, feel free to send them my way!",
                'notified': "🎉 Your issue has been resolved! Please check to make sure everything is working. If you encounter any bugs or have feature requests, feel free to send them my way!",
                'wontfix': "We've reviewed your request. Unfortunately, we won't be able to implement this at this time."
            };

            const message = statusMessages[newStatus];
            if (message) {
                await supabase
                    .from('app_support_messages')
                    .insert({
                        user_id: draggedTicket.user_id,
                        content: message,
                        from_admin: true,
                        message_type: 'text',
                        created_at: new Date().toISOString()
                    });
            }

            setDraggedTicket(null);
            loadTickets();
        } catch (err) {
            console.error('Error moving:', err);
            alert('Failed to update status.');
        }
    };

    if (loading) return <div className="text-[var(--soup-dark)] font-bold italic animate-pulse p-8">Loading support tickets... 🍜</div>;

    const filteredTickets = tickets.filter(t =>
        filterCategory === 'all' || t.category === filterCategory
    );

    const openTickets = filteredTickets.filter(t => t.status === 'new');
    const inProgressTickets = filteredTickets.filter(t => t.status === 'investigating' || t.status === 'fixing');
    const builtTickets = filteredTickets.filter(t => t.status === 'fixed');
    const resolvedTickets = filteredTickets.filter(t => t.status === 'resolved' || t.status === 'notified' || t.status === 'wontfix');

    const Column = ({ title, tickets, status, color }) => {
        const colorStyles = {
            pink: 'bg-[var(--soup-pink)] text-white',
            blue: 'bg-[var(--soup-turquoise)] text-white',
            purple: 'bg-purple-500 text-white',
            green: 'bg-[var(--soup-green)] text-white',
        };

        return (
            <div className="flex flex-col min-w-[320px]">
                <div className={`p-5 rounded-t-[24px] ${colorStyles[color]} shadow-sm mb-2`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black tracking-widest uppercase">{title}</h3>
                        <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-black">
                            {tickets.length}
                        </span>
                    </div>
                </div>
                <div
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => handleDrop(e, status)}
                    className={`flex-1 bg-white/50 rounded-b-[24px] p-4 min-h-[500px] border border-black/5 transition-all ${draggedTicket ? 'ring-2 ring-[var(--soup-turquoise)]/30' : ''}`}
                >
                    <div className="space-y-4">
                        {tickets.map(ticket => (
                            <div
                                key={ticket.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, ticket)}
                                onClick={() => { setEditingTicket({ ...ticket }); setShowModal(true); }}
                                className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-grab active:cursor-grabbing group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex gap-2">
                                        {ticket.isUrgent && (
                                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded-full uppercase tracking-widest">
                                                Urgent
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 ${ticket.category === 'feature_request' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'} text-[8px] font-black rounded-full uppercase tracking-widest`}>
                                            {ticket.category === 'feature_request' ? 'Feature' : 'Bug'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400">{timeAgo(ticket.created_at)}</div>
                                </div>
                                <h4 className="font-bold text-[var(--soup-dark)] leading-tight mb-3 group-hover:text-[var(--soup-turquoise)] transition-colors line-clamp-2">{ticket.title}</h4>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden border border-black/5">
                                        {ticket.app_users?.avatar_url ? (
                                            <img src={ticket.app_users.avatar_url} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200" />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400">@{ticket.app_users?.display_name?.split(' ')[0] || 'user'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {tickets.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                            <Plus size={32} className="text-gray-300 mb-2" />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empty</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-[var(--soup-dark)] tracking-tight">User Support 📡</h2>
                    <p className="text-gray-500 font-bold mt-1">Managing bugs and feature requests</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative group">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="appearance-none px-8 py-4 bg-white border border-black/5 rounded-2xl font-black text-[var(--soup-dark)] text-sm focus:ring-2 focus:ring-[var(--soup-turquoise)]/20 shadow-sm pr-12 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                            <option value="all">All Support</option>
                            <option value="bug">Bugs</option>
                            <option value="feature_request">Feature Requests</option>
                        </select>
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={18} />
                    </div>
                </div>
            </div>

            <div className="flex overflow-x-auto gap-8 pb-12 no-scrollbar">
                <Column title="Open" tickets={openTickets} status="new" color="pink" />
                <Column title="In Progress" tickets={inProgressTickets} status="fixing" color="blue" />
                <Column title="Built" tickets={builtTickets} status="fixed" color="purple" />
                <Column title="Resolved" tickets={resolvedTickets} status="resolved" color="green" />
            </div>

            <button
                onClick={() => setShowCreateModal(true)}
                className="fixed bottom-10 right-10 w-20 h-20 bg-[var(--soup-turquoise)] text-white rounded-[28px] shadow-xl hover:scale-110 active:scale-90 transition-all flex items-center justify-center group z-40"
            >
                <Plus size={32} />
            </button>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-6 z-[9999] animate-in fade-in duration-300" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-[48px] shadow-2xl max-w-md w-full p-10 transform animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">new ticket 🐛</h3>
                        <input
                            type="text"
                            value={newTicket.title}
                            onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                            className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[#00adef]/30 focus:bg-white rounded-[24px] focus:ring-0 text-lg font-bold transition-all mb-6"
                            placeholder="what's the tea?"
                            autoFocus
                        />
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setNewTicket({ ...newTicket, category: 'bug' })}
                                className={`flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${newTicket.category === 'bug' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-100 text-gray-400'}`}
                            >
                                <AlertTriangle size={18} /> Bug
                            </button>
                            <button
                                onClick={() => setNewTicket({ ...newTicket, category: 'feature_request' })}
                                className={`flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${newTicket.category === 'feature_request' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 text-gray-400'}`}
                            >
                                <Lightbulb size={18} /> Feature
                            </button>
                        </div>
                        <label className="flex items-center gap-3 mb-8 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={newTicket.isUrgent}
                                onChange={(e) => setNewTicket({ ...newTicket, isUrgent: e.target.checked })}
                                className="w-6 h-6 rounded-lg border-2 border-gray-200 text-[#ec008b] focus:ring-[#ec008b]/20 transition-all cursor-pointer"
                            />
                            <span className="font-black text-gray-500 uppercase text-xs tracking-widest group-hover:text-red-500 transition-colors">🚨 this is high key urgent</span>
                        </label>
                        <div className="flex gap-4">
                            <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-gray-400 font-black hover:text-gray-600 transition-colors">cancel</button>
                            <button onClick={handleCreateTicket} className="flex-2 px-10 py-4 bg-black text-white rounded-[24px] font-black hover:scale-105 active:scale-95 transition-all">Add Ticket 🚀</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showModal && editingTicket && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-6 z-[9999] animate-in fade-in duration-300" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-[48px] shadow-2xl max-w-2xl w-full p-10 transform animate-in zoom-in-95 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">edit ticket</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X /></button>
                        </div>
                        <input
                            type="text"
                            value={editingTicket.title || ''}
                            onChange={(e) => setEditingTicket({ ...editingTicket, title: e.target.value })}
                            className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent focus:border-[#00adef]/30 focus:bg-white rounded-[28px] focus:ring-0 text-xl font-bold transition-all mb-8"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">category</label>
                                <select
                                    value={editingTicket.category}
                                    onChange={(e) => setEditingTicket({ ...editingTicket, category: e.target.value })}
                                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl font-black text-gray-700 focus:ring-2 focus:ring-[#00adef]/10"
                                >
                                    <option value="bug">🐛 Bug</option>
                                    <option value="feature_request">💡 Feature</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">status</label>
                                <select
                                    value={editingTicket.status}
                                    onChange={(e) => setEditingTicket({ ...editingTicket, status: e.target.value })}
                                    className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl font-black text-gray-700 focus:ring-2 focus:ring-[#00adef]/10"
                                >
                                    <option value="new">needs help</option>
                                    <option value="investigating">investigating</option>
                                    <option value="fixing">cooking...</option>
                                    <option value="fixed">shipped 💎</option>
                                    <option value="notified">user notified 🔔</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2 mb-8 lowercase italic">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">the tea</label>
                            <div className="bg-gray-50/80 rounded-[32px] p-8 text-gray-700 font-bold leading-relaxed border border-gray-100">
                                {editingTicket.content}
                            </div>
                        </div>

                        <div className="flex gap-4 items-center justify-between pt-6">
                            <button
                                onClick={handleDeleteTicket}
                                disabled={deleting}
                                className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Trash2 size={20} />
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                            <div className="flex gap-4">
                                <button onClick={() => setShowModal(false)} className="px-6 py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors">Cancel</button>
                                <button onClick={handleSaveTicket} className="px-10 py-4 bg-[var(--soup-turquoise)] text-white rounded-[20px] font-black shadow-lg shadow-[var(--soup-turquoise)]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                    <Check size={20} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
