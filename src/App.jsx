
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { BarChart3, Users, MessageSquare, LifeBuoy, LogOut, Search, Zap, Megaphone, TrendingUp, Activity, MessageCircle, Layers, Menu, X, Target, DollarSign, Share2 } from 'lucide-react';
import ChallengesTab from './ChallengesTab';
import AnnouncementsTab from './AnnouncementsTab';
import MarketingTab from './MarketingTab';
import GrowthCharts from './GrowthCharts';
import SupportInbox from './SupportInbox';
import SupportTabSimplified from './SupportTabSimplified';
import GoalsTab from './GoalsTab';
import FinancesTab from './FinancesTab';
import WeeklyUpdateTab from './WeeklyUpdateTab';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Initialize activeTab from URL or localStorage
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    if (urlTab) return urlTab;
    return localStorage.getItem('dashboardActiveTab') || 'overview';
  });

  const [kitchenSubTab, setKitchenSubTab] = useState('challenges');
  const [fireSubTab, setFireSubTab] = useState('support');

  // Sync URL when activeTab changes
  useEffect(() => {
    localStorage.setItem('dashboardActiveTab', activeTab);

    // Update URL
    const url = new URL(window.location);
    const currentTab = url.searchParams.get('tab');

    // Only update if changed to avoid overwriting view params unnecessarily on mount
    if (currentTab !== activeTab) {
      url.searchParams.set('tab', activeTab);
      url.searchParams.delete('view'); // Reset sub-view when switching main tabs
      window.history.pushState({}, '', url);
    }
  }, [activeTab]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth
  const [name, setName] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');

  // Notification Badges
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    checkUser();
    loadNotificationCounts();
  }, []);

  const loadNotificationCounts = async () => {
    try {
      // Pending Language Requests
      const { count } = await supabase
        .from('app_language_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingRequestsCount(count || 0);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const checkUser = async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // Ensure Official Bot exists for challenge broadcasting
      const SYSTEM_BOT_ID = '00000000-0000-0000-0000-000000000000';
      const { data: botExists } = await supabase.from('app_users').select('id').eq('id', SYSTEM_BOT_ID).single();

      // Comprehensive list of languages for the bot
      const ALL_LANGUAGES = ['Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Dutch', 'Hungarian', 'Swedish', 'Korean', 'English'];

      if (!botExists) {
        console.log('🥣 Creating official Language Soup bot...');
        await supabase.from('app_users').upsert({
          id: SYSTEM_BOT_ID,
          display_name: 'language soup',
          avatar_url: 'https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/avatars/00000000-0000-0000-0000-000000000000/bot-avatar.png',
          is_admin: true,
          is_community_manager: true,
          status_text: 'Official Soup Bot',
          learning_languages: null,
          fluent_languages: null
        });
      } else {
        // Update existing bot to match new requirements
        await supabase.from('app_users').update({
          display_name: 'language soup',
          avatar_url: 'https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/avatars/00000000-0000-0000-0000-000000000000/bot-avatar.png',
          learning_languages: null,
          fluent_languages: null
        }).eq('id', SYSTEM_BOT_ID);
      }

      if (user) {
        // Verify admin status
        const { data } = await supabase
          .from('app_users')
          .select('is_admin, display_name')
          .eq('id', user.id)
          .single();

        if (data?.is_admin) {
          setUser(user);
        }
      }
    } catch (error) {
      console.error('Error in checkUser:', error);
      // Optional: set some error state here if needed
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoggingIn(true);
    setAuthError('');

    try {
      // Check if this name is the admin
      if (name.trim().toLowerCase() !== 'noah :)') {
        throw new Error('Not an admin account');
      }

      // Sign in anonymously
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      if (data.user) {
        // Check if this specific auth user already has a profile
        const { data: existingProfile } = await supabase
          .from('app_users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          // Create user profile with admin access only if it doesn't exist
          const { error: profileError } = await supabase
            .from('app_users')
            .upsert({
              id: data.user.id,
              display_name: name.trim(),
              is_admin: true,
              is_community_manager: true,
              avatar_url: `https://api.dicebear.com/7.x/avataaars/png?seed=${data.user.id}`,
              status_text: 'Founder Daddy',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (profileError) {
            console.warn('Profile creation error:', profileError);
          }
        }

        setUser(data.user);
      }
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      await supabase.auth.signOut();
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--soup-beige)]">
        <div className="bg-white rounded-3xl shadow-sm p-10 w-full max-w-md border border-black/5">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[var(--soup-turquoise)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--soup-turquoise)]/20">
              <span className="text-3xl">🍜</span>
            </div>
            <h1 className="text-4xl font-extrabold mb-2 text-[var(--soup-dark)] tracking-tight">
              LANGUAGE SOUP
            </h1>
            <p className="text-gray-400 font-bold tracking-widest uppercase text-xs">Admin Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Your Admin Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="noah :)"
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-[var(--soup-turquoise)]/30 focus:bg-white rounded-2xl text-lg font-bold transition-all focus:ring-0"
                autoFocus
              />
            </div>

            {authError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || !name.trim()}
              className="w-full py-4 px-4 bg-[var(--soup-turquoise)] text-white rounded-2xl font-black text-lg shadow-lg shadow-[var(--soup-turquoise)]/20 hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-50 mt-4"
            >
              {loggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4 italic">
            (hint: only admins can access this)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--soup-beige)] text-[var(--soup-dark)]">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg border border-black/5"
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`w-64 bg-white border-r border-black/5 flex flex-col shadow-sm z-40 fixed lg:static h-full transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--soup-turquoise)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--soup-turquoise)]/20 overflow-hidden relative">
              <img src="/src/assets/branding/ls-icon-bowl.png" alt="Soup Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <h1 className="text-lg font-black tracking-tight text-[var(--soup-dark)] leading-tight lowercase">language</h1>
                <img src="/src/assets/images/avatars/tomato_soup.png" className="w-4 h-4 rounded-full" alt="decor" />
              </div>
              <h1 className="text-lg font-black tracking-tight text-[var(--soup-turquoise)] leading-tight lowercase">soup</h1>
            </div>
          </div>
          <p className="text-[10px] font-bold text-gray-400 mt-2 tracking-widest uppercase">Admin Dashboard</p>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2">
          {[
            { id: 'castle', label: 'the castle', icon: Target },
            { id: 'kitchen', label: 'the kitchen', icon: Share2 },
            { id: 'fire_station', label: 'fire station', icon: LifeBuoy, badge: pendingRequestsCount },
            { id: 'garden', label: 'the garden', icon: TrendingUp },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-black transition-all ${activeTab === item.id || (activeTab === 'overview' && item.id === 'castle')
                ? 'bg-[var(--soup-turquoise)] text-white shadow-lg shadow-[var(--soup-turquoise)]/20'
                : 'text-gray-500 hover:bg-white hover:text-[var(--soup-turquoise)]'
                }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="text-sm lowercase">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === item.id
                  ? 'bg-white text-[var(--soup-turquoise)]'
                  : 'bg-red-500 text-white'
                  }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setActiveTab('finances');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs transition-all ${activeTab === 'finances'
                ? 'bg-gray-100 text-[var(--soup-dark)]'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <DollarSign size={14} />
              <span className="lowercase">finances</span>
            </button>
          </div>
        </nav>

        <div className="p-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 font-bold hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto flex flex-col">
        <main className="p-4 lg:p-10 max-w-7xl w-full mx-auto flex-1 mt-16 lg:mt-0">
          {/* 🏰 The Castle: Insights & Goals */}
          {(activeTab === 'castle' || activeTab === 'overview') && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h1 className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">gm {user.display_name?.split(' ')[0]} ✨</h1>
                  <p className="text-gray-500 font-bold mt-1">the state of the soup today.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-[var(--soup-green)] rounded-full text-xs font-black uppercase tracking-wider border border-[var(--soup-green)]/10">
                  <div className="w-2 h-2 rounded-full bg-[var(--soup-green)] animate-pulse"></div>
                  App is Live
                </div>
              </div>

              <div className="space-y-12">
                <OverviewTab />
                <div className="pt-8 border-t border-black/5">
                  <h3 className="text-2xl font-black text-[var(--soup-dark)] mb-6 flex items-center gap-2">
                    <Target className="text-[var(--soup-turquoise)]" size={24} />
                    2026 roadmap
                  </h3>
                  <GoalsTab />
                </div>
              </div>
            </div>
          )}

          {/* 🍳 The Kitchen: Engagement & Content */}
          {/* 🍳 The Kitchen: Engagement & Content */}
          {activeTab === 'kitchen' && (
            <div className="space-y-16 animate-in fade-in duration-500">
              <div className="mb-6">
                <h1 className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">the kitchen 🍳</h1>
                <p className="text-gray-500 font-bold mt-1">cook up some community vibe.</p>
              </div>

              {/* 1. Top Hub: Broadcasts */}
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-[var(--soup-dark)] flex items-center gap-2">
                  <Megaphone className="text-[var(--soup-pink)]" size={24} />
                  broadcasts
                </h3>
                <div className="bg-white rounded-[32px] overflow-hidden border border-black/5 shadow-sm">
                  <PillarSubNav
                    options={[
                      { id: 'challenges', label: 'challenges' },
                      { id: 'announcements', label: 'announcements' }
                    ]}
                    activeId={kitchenSubTab || 'challenges'}
                    onChange={(id) => setKitchenSubTab(id)}
                  />
                  <div className="p-8">
                    {(kitchenSubTab === 'challenges' || !kitchenSubTab || kitchenSubTab === 'groups') && <ChallengesTab user={user} />}
                    {kitchenSubTab === 'announcements' && <AnnouncementsTab />}
                  </div>
                </div>
              </div>

              {/* 2. Middle: Weekly Update Tool */}
              <div className="pt-8 border-t border-black/5">
                <WeeklyUpdateTab />
              </div>

              {/* ✨ Special: community snapshots & souper vibe ✨ */}
              <div className="pt-8 border-t border-black/5">
                <div className="flex justify-between items-end mb-6">
                  <h3 className="text-2xl font-black text-[var(--soup-dark)] flex items-center gap-2">
                    <Activity className="text-amber-500" size={24} />
                    community snapshots
                  </h3>
                  <div className="flex -space-x-3">
                    {[
                      '/src/assets/images/avatars/tomato_soup.png',
                      '/src/assets/images/avatars/chicken_soup.png',
                      '/src/assets/images/avatars/bathtub_soup.png',
                      '/src/assets/images/avatars/cereal.png'
                    ].map((avatar, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-4 border-[var(--soup-beige)] overflow-hidden shadow-sm">
                        <img src={avatar} className="w-full h-full object-cover" alt="soup avatar" />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-full border-4 border-[var(--soup-beige)] bg-white flex items-center justify-center text-[10px] font-black text-gray-400">
                      +1k
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 no-scrollbar">
                  {[
                    '/src/assets/branding/uploaded_image_1_1768252912948.png',
                    '/src/assets/branding/uploaded_image_0_1768252733011.png',
                    '/src/assets/branding/uploaded_image_2_1768252912948.png',
                    '/src/assets/branding/uploaded_image_0_1768260317915.png',
                    '/src/assets/branding/uploaded_image_1768242014329.png'
                  ].map((img, i) => (
                    <div key={i} className="flex-none w-64 h-64 bg-white rounded-[32px] overflow-hidden border border-black/5 shadow-sm group">
                      <img src={img} alt={`snapshot ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Bottom: Groups Hub */}
              <div className="pt-8 border-t border-black/5">
                <h3 className="text-2xl font-black text-[var(--soup-dark)] mb-6 flex items-center gap-2">
                  <Users className="text-[var(--soup-turquoise)]" size={24} />
                  groups management
                </h3>
                <GroupsTab />
              </div>
            </div>
          )}

          {/* 🚒 The Fire Station: Support & Users */}
          {activeTab === 'fire_station' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="mb-10">
                <h1 className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">the fire station 🚒</h1>
                <p className="text-gray-500 font-bold mt-1">triage and user care.</p>
              </div>
              <div className="bg-white rounded-[32px] overflow-hidden border border-black/5 shadow-sm">
                <PillarSubNav
                  options={[
                    { id: 'support', label: 'support tickets' },
                    { id: 'users', label: 'user directory' }
                  ]}
                  activeId={fireSubTab || 'support'}
                  onChange={setFireSubTab}
                />
                <div className="p-8">
                  {(fireSubTab === 'support' || !fireSubTab) && <SupportTab />}
                  {fireSubTab === 'users' && <UsersTab />}
                </div>
              </div>
            </div>
          )}

          {/* 📈 The Garden: Growth & Marketing */}
          {activeTab === 'garden' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="mb-6">
                <h1 className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">the garden 📈</h1>
                <p className="text-gray-500 font-bold mt-1">seeds of growth.</p>
              </div>

              {/* marketing banner */}
              <div className="w-full h-48 bg-white rounded-[32px] overflow-hidden border border-black/5 shadow-sm relative group">
                <img
                  src="/src/assets/marketing_concepts/feature_graphic_final_v2_1768138772345.png"
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  alt="Soup Vision"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-6 left-8">
                  <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">vision: community mission 2026</p>
                </div>
              </div>

              <MarketingTab />
            </div>
          )}

          {/* 💸 Finances: Admin Only (Hidden) */}
          {activeTab === 'finances' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="mb-10">
                <h1 className="text-4xl font-black text-[var(--soup-dark)] tracking-tight">finances 💸</h1>
                <p className="text-gray-500 font-bold mt-1">the boring back-office stuff.</p>
              </div>
              <FinancesTab />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Sub-navigation for Pillars
function PillarSubNav({ options, activeId, onChange }) {
  return (
    <div className="flex border-b border-gray-100 px-4">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeId === opt.id
            ? 'text-[var(--soup-turquoise)]'
            : 'text-gray-400 hover:text-gray-600'
            }`}
        >
          {opt.label}
          {activeId === opt.id && (
            <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-[var(--soup-turquoise)] rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}

// Sub-components moved out of App
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewingGroups, setViewingGroups] = useState(null); // { user: userObj, groups: [] }

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('admin_get_users_with_notifications');

      if (error) throw error;

      // Filter out test users (noah, bots, system)
      const filteredData = (data || []).filter(u => {
        const name = (u.display_name || '').toLowerCase();
        return !name.includes('noah') && !name.includes('bot') && !name.includes('system');
      });

      setUsers(filteredData);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewGroups = async (user) => {
    if (!user.group_count || user.group_count === 0) return;

    try {
      const { data: members, error } = await supabase
        .from('app_group_members')
        .select(`
          group_id,
          app_groups (
            id,
            name,
            language,
            level
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const groups = members.map(m => m.app_groups).filter(Boolean);
      setViewingGroups({ user, groups });
    } catch (err) {
      console.error('Error fetching user groups:', err);
      alert('Failed to load groups');
    }
  };

  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-gray-600">Loading users...</div>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-sm text-gray-600">{filteredUsers.length} users</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Learning 🌱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversational 💬</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Groups</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notifications 🔔</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.display_name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {(user.display_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="font-medium text-gray-900">{user.display_name || 'Unknown'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {user.learning_languages ? (
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(user.learning_languages) ? user.learning_languages : [user.learning_languages]).map((lang, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">{lang}</span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {user.fluent_languages ? (
                      <div className="flex flex-wrap gap-1">
                        {(Array.isArray(user.fluent_languages) ? user.fluent_languages : [user.fluent_languages]).map((lang, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">{lang}</span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    <button
                      onClick={() => handleViewGroups(user)}
                      disabled={!user.group_count}
                      className={`font-medium ${user.group_count ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' : 'text-gray-400 cursor-default'}`}
                    >
                      {user.group_count || 0}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {user.has_notifications ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        On
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Off
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Groups Modal */}
        {viewingGroups && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingGroups(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{viewingGroups.user.display_name}'s Groups</h3>
                  <p className="text-sm text-gray-500">{viewingGroups.groups.length} active memberships</p>
                </div>
                <button onClick={() => setViewingGroups(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                  <X size={20} />
                </button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                {viewingGroups.groups.length > 0 ? (
                  <div className="space-y-1">
                    {viewingGroups.groups.map(group => (
                      <div key={group.id} className="p-3 hover:bg-gray-50 rounded-xl flex items-center gap-3 transition-colors border border-transparent hover:border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm">
                          {group.language.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{group.name}</div>
                          <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 uppercase text-[10px] tracking-wide">{group.language}</span>
                            <span className="text-gray-300">•</span>
                            <span className="capitalize">{group.level}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-400 italic">No groups found</div>
                )}
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setViewingGroups(null)}
                  className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 px-2 border-b-2 transition ${active
        ? 'border-[#00adef] text-[#00adef] font-bold'
        : 'border-transparent text-gray-400 hover:text-gray-600'
        }`}
    >
      <Icon size={20} />
      {label}
    </button>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    totalGroups: 0,
    shares: [],
    totalShares: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Exclude test users: noah, bots, system accounts
      const { data: allUsers } = await supabase
        .from('app_users')
        .select('id, display_name');

      const realUsers = allUsers?.filter(u => {
        const name = (u.display_name || '').toLowerCase();
        return !name.includes('noah') && !name.includes('bot') && !name.includes('system');
      }) || [];

      const usersCount = realUsers.length;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: activeUserIds } = await supabase
        .from('app_messages')
        .select('sender_id')
        .gte('created_at', sevenDaysAgo.toISOString());

      const uniqueActive = new Set(activeUserIds?.map(m => m.sender_id) || []);

      const { count: messagesCount } = await supabase
        .from('app_messages')
        .select('*', { count: 'exact', head: true });

      const { count: groupsCount } = await supabase
        .from('app_groups')
        .select('*', { count: 'exact', head: true });

      // Fetch viral shares
      const { data: shareLinks } = await supabase
        .from('app_share_links')
        .select(`
            id,
            user_id,
            created_at,
            app_users!app_share_links_user_id_fkey(display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Exclude Noah/Bots from shares as well
      const realUserIds = new Set(realUsers.map(u => u.id));
      const filteredShareLinks = (shareLinks || []).filter(s => realUserIds.has(s.user_id));

      let shares = [];
      if (filteredShareLinks.length > 0) {
        const userShareCounts = {};
        filteredShareLinks.forEach(share => {
          const userId = share.user_id;
          const userName = share.app_users?.display_name || 'Unknown';
          const userAvatar = share.app_users?.avatar_url;

          if (!userShareCounts[userId]) {
            userShareCounts[userId] = {
              name: userName,
              avatar: userAvatar,
              count: 0
            };
          }
          userShareCounts[userId].count++;
        });
        shares = Object.values(userShareCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }

      setStats({
        totalUsers: usersCount || 0,
        activeUsers: uniqueActive.size,
        totalMessages: messagesCount || 0,
        totalGroups: groupsCount || 0,
        shares: shares,
        totalShares: filteredShareLinks.length || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-[var(--soup-dark)] font-bold italic animate-pulse p-8">Loading overview... 🍜</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard
          label="Soupers"
          value={stats.totalUsers}
          color="sky"
          icon={Users}
        />
        <StatCard
          label="Active (7d)"
          value={stats.activeUsers}
          color="pink"
          icon={Activity}
        />
        <StatCard
          label="Messages"
          value={stats.totalMessages}
          color="indigo"
          icon={MessageCircle}
        />
        <StatCard
          label="Groups"
          value={stats.totalGroups}
          color="amber"
          icon={Layers}
        />
      </div>

      <div className="mb-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">growth timeline 📈</h3>
            <p className="text-sm font-bold text-gray-500 italic mt-1">
              the journey from whatsapp to the main stage
            </p>
          </div>
        </div>
        <GrowthCharts />
      </div>


    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }) {
  const colorStyles = {
    sky: 'text-[var(--soup-turquoise)] bg-sky-50',
    pink: 'text-[var(--soup-pink)] bg-pink-50',
    indigo: 'text-indigo-500 bg-indigo-50',
    amber: 'text-amber-500 bg-amber-50',
  };

  return (
    <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm hover:translate-y-[-4px] transition-all group overflow-hidden relative">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-2xl ${colorStyles[color]} group-hover:bg-white border border-black/5 group-hover:shadow-md transition-all`}>
          <Icon size={20} />
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
      </div>
      <div className="text-4xl font-black text-[var(--soup-dark)] tracking-tighter">
        {value.toLocaleString()}
      </div>
    </div>
  );
}



// Groups Tab
function GroupsTab() {
  const [groups, setGroups] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('active'); // 'active' or 'requests'
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Create Group Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupLanguage, setNewGroupLanguage] = useState('');
  const [newGroupRequests, setNewGroupRequests] = useState([]);

  useEffect(() => {
    loadGroups();
    loadRequests();
  }, []);

  const loadGroups = async () => {
    try {
      const { data } = await supabase
        .from('app_groups')
        .select('id, name, language, member_count, created_at')
        .order('member_count', { ascending: false });

      setGroups(data || []);
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const [expandedRequest, setExpandedRequest] = useState(null);

  const loadRequests = async () => {
    try {
      const { data } = await supabase
        .from('app_language_requests')
        .select(`
      *,
      user:app_users!app_language_requests_user_id_fkey(display_name, avatar_url)
      `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setRequests(data || []);
    } catch (err) {
      console.error('Error loading requests:', err);
    }
  };


  const loadMembers = async (groupId) => {
    try {
      const { data } = await supabase
        .from('app_group_members')
        .select('app_users!app_group_members_user_id_fkey(display_name, avatar_url)')
        .eq('group_id', groupId);

      setMembers(data?.map(m => m.app_users) || []);
    } catch (err) {
      console.error('Error loading members:', err);
      setMembers([]);
    }
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    loadMembers(group.id);
  };

  const openCreateModal = (requestGroup) => {
    setNewGroupLanguage(requestGroup.language);
    setNewGroupName(`${requestGroup.language} (Soup)`);
    setNewGroupRequests(requestGroup.requests);
    setShowCreateModal(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupLanguage.trim()) return;

    setCreatingGroup(true);
    try {
      // 1. Create Group
      const { data: group, error } = await supabase
        .from('app_groups')
        .insert({
          name: newGroupName.trim(),
          language: newGroupLanguage.trim(),
          member_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Mark requests as approved
      if (newGroupRequests.length > 0) {
        await supabase
          .from('app_language_requests')
          .update({ status: 'approved' })
          .in('id', newGroupRequests.map(r => r.id));
      }

      alert('Group created successfully!');
      setShowCreateModal(false);
      loadGroups();
      loadRequests();
      setActiveView('active');
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const deleteRequest = async (requestId) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      await supabase
        .from('app_language_requests')
        .delete()
        .eq('id', requestId);

      loadRequests();
    } catch (err) {
      console.error('Error deleting request:', err);
      alert('Failed to delete request');
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading groups...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
      {/* List Column */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
        {/* Toggle Header */}
        <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveView('active')}
              className={`font-bold pb-1 transition ${activeView === 'active' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Active Groups ({groups.length})
            </button>
            <button
              onClick={() => setActiveView('requests')}
              className={`font-bold pb-1 transition ${activeView === 'requests' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Requests ({requests.length})
            </button>
          </div>
          {activeView === 'active' && (
            <button
              onClick={() => openCreateModal({ language: '', requests: [] })}
              className="px-4 py-2 bg-[var(--soup-turquoise)] text-white rounded-lg text-sm font-bold hover:opacity-90 transition"
            >
              + Create Group
            </button>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
          {activeView === 'active' ? (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition ${selectedGroup?.id === group.id ? 'bg-blue-50' : ''}`}
              >
                <div className="font-medium text-gray-900">{group.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {group.language} • {group.member_count} members
                </div>
              </button>
            ))
          ) : (
            requests.length === 0 ? (
              <div className="p-8 text-center text-gray-500 italic">No pending requests yet. 🍜</div>
            ) : requests.map((req, i) => (
              <div key={i} className="px-6 py-5 border-b border-gray-100 last:border-0 hover:bg-gray-50/80 transition flex items-start gap-4">
                {/* User Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex-shrink-0 overflow-hidden shadow-sm">
                  {req.user?.avatar_url ? (
                    <img src={req.user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-blue-500 font-bold text-xs">
                      {req.user?.display_name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 truncate flex-1">
                      {req.user?.display_name || 'Anonymous'}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 ml-2 uppercase tracking-tight">
                      {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="mb-2">
                    <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px] font-bold uppercase tracking-wider mb-1">
                      {req.language_name || 'Unknown'}
                    </span>
                    {req.message && req.message !== "No message" && (
                      <div className="text-gray-600 text-[13px] leading-relaxed italic border-l-2 border-gray-100 pl-3 py-1 mt-1">
                        "{req.message}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {req.language_name && (
                      <button
                        onClick={() => openCreateModal({ language: req.language_name, requests: [req] })}
                        className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600 shadow-sm transition active:scale-95"
                      >
                        Create Group
                      </button>
                    )}
                    <button
                      onClick={() => deleteRequest(req.id)}
                      className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition"
                      title="Delete Request"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
          }
        </div>
      </div>

      {/* Details/Members Column (Only visible when a group is selected in Active view) */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[600px] flex flex-col">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="font-bold text-gray-900">
            {activeView === 'requests' ? 'Info' : (selectedGroup ? `${selectedGroup.name} Members` : 'Select a group')}
          </h2>
        </div>

        {activeView === 'requests' ? (
          <div className="p-6 text-gray-600">
            <p>Accepting a language request will:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Create a new public group for that language</li>
              <li>Mark all pending requests for that language as "approved"</li>
              <li>(Future) Automatically invite interested users</li>
            </ul>
          </div>
        ) : (
          selectedGroup && (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
              {members.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-600">
                  No members yet
                </div>
              ) : (
                members.map((member, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {member.display_name || 'Unknown'}
                    </div>
                    {member.email && (
                      <div className="text-sm text-gray-600">{member.email}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Create New Group</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Language</label>
                <input
                  type="text"
                  value={newGroupLanguage}
                  onChange={(e) => setNewGroupLanguage(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2"
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Support Tab - Trello-style Ticket Board
function SupportTab() {
  const [activeView, setActiveView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'tickets';
  });

  const handleViewChange = (newView) => {
    setActiveView(newView);
    const url = new URL(window.location);
    url.searchParams.set('view', newView);
    window.history.pushState({}, '', url);
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Tab Switcher */}
      <div className="mb-6 flex items-center gap-4 bg-white p-2 rounded-2xl border border-black/5 shadow-sm w-fit">
        <button
          onClick={() => handleViewChange('tickets')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeView === 'tickets'
            ? 'bg-[var(--soup-turquoise)] text-white shadow-md'
            : 'text-gray-500 hover:text-[var(--soup-turquoise)]'
            }`}
        >
          🎫 Tickets
        </button>
        <button
          onClick={() => handleViewChange('inbox')}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${activeView === 'inbox'
            ? 'bg-[var(--soup-turquoise)] text-white shadow-md'
            : 'text-gray-500 hover:text-[var(--soup-turquoise)]'
            }`}
        >
          💬 Inbox
        </button>
      </div>

      {/* Content */}
      {activeView === 'tickets' ? <SupportTabSimplified /> : <SupportInbox />}
    </div>
  );
}
