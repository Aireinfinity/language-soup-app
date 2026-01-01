import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';

// Warm up the browser to improve startup time
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileChecked, setProfileChecked] = useState(false);
    const [bootScreenShown, setBootScreenShown] = useState(false);
    const router = useRouter();
    const segments = useSegments();
    const navigationState = useRootNavigationState();

    useEffect(() => {
        // Check active sessions and subscribe to auth changes
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            // Reset profile check on logout or user change
            if (!session?.user) {
                setProfileChecked(false);
                setBootScreenShown(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // ... (setSessionFromUrl remains same)

    const setSessionFromUrl = async (url) => {
        if (!url) return;
        try {
            const getParam = (name) => {
                const regex = new RegExp(`[#?&]${name}=([^&]*)`);
                const results = regex.exec(url);
                return results ? decodeURIComponent(results[1]) : null;
            };

            const access_token = getParam('access_token');
            const refresh_token = getParam('refresh_token');

            if (access_token && refresh_token) {
                const { error } = await supabase.auth.setSession({
                    access_token,
                    refresh_token,
                });
                if (error) console.error('Error setting session:', error);
            }
        } catch (err) {
            console.error('Error parsing session from URL:', err);
        }
    };

    // Protected Route Logic
    // ... (Link listener remains same)

    useEffect(() => {
        // Handle deep links for OAuth login (if browser redirects automatically)
        const handleDeepLink = (event) => {
            if (event.url) setSessionFromUrl(event.url);
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        Linking.getInitialURL().then((url) => {
            if (url) setSessionFromUrl(url);
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Protected Route Logic & Profile Check
    useEffect(() => {
        if (loading) return;
        if (!navigationState?.key) return; // Wait for navigation to be ready

        const currentRoute = segments[0];
        const publicRoutes = ['index', 'how-it-works', 'login', 'onboarding'];
        const isPublicRoute = publicRoutes.includes(currentRoute) || !currentRoute;

        if (!user && !isPublicRoute) {
            console.log('[Auth] Redirecting to login. User:', user, 'Route:', currentRoute);
            // Redirect to login if not authenticated and trying to access protected route
            router.replace('/login');
        } else if (user) {
            // User is authenticated

            // Check cache first to avoid loops
            if (profileChecked) return;

            // Skip auto-redirect if user is in onboarding flow
            const inOnboardingFlow = currentRoute?.includes('onboarding') || currentRoute?.includes('login');

            // Only check profile and redirect from initial load, NOT from login/onboarding screens
            const isInitialLoad = !segments || segments.length === 0 || (segments.length === 1 && (segments[0] === '' || segments[0] === 'index'));

            if (isInitialLoad && !bootScreenShown && !inOnboardingFlow) {
                console.log('[Auth] Initial authenticated load, checking profile...');
                checkProfileAndRedirect(user, true, false, segments[0]);
            }
        }
    }, [user, loading, segments, profileChecked, bootScreenShown]);

    const checkProfileAndRedirect = async (currentUser, inAuthGroup, inOnboarding, currentSegment) => {
        // For anonymous users (our new flow), check if they have groups
        if (currentUser.is_anonymous) {
            try {
                // Check if user has joined any groups
                const { data: groups, error } = await supabase
                    .from('app_group_members')
                    .select('group_id')
                    .eq('user_id', currentUser.id)
                    .limit(1);

                if (error) throw error;

                setProfileChecked(true);

                // DIRECT NAVIGATION (Skip Boot Screen here)
                // If user has groups -> Home. If new -> Group Selection.
                if (groups && groups.length > 0) {
                    router.replace('/(tabs)');
                } else {
                    router.replace('/group-selection');
                }

            } catch (error) {
                console.error('Error checking groups:', error);
                router.replace('/group-selection');
            }
            return;
        }

        // Legacy: For non-anonymous users (email/password), use old logic
        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('id')
                .eq('id', currentUser.id)
                .single();

            const hasProfile = !!data;

            if (!hasProfile) {
                // If no profile, force onboarding
                if (!inOnboarding) {
                    router.replace('/login');
                }
            } else {
                setProfileChecked(true);
                // If profile exists, show boot screen once, then go to tabs
                if (inAuthGroup || inOnboarding) {
                    if (!bootScreenShown) {
                        // Mark as checked so we don't re-run this
                        setProfileChecked(true);
                        // If we're not at the boot screen (/), go there
                        if (currentSegment !== undefined && currentSegment !== '' && currentSegment !== 'index') {
                            router.replace('/');
                        }
                    } else {
                        setProfileChecked(true);
                        router.replace('/(tabs)');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking profile:', error);
            if (inAuthGroup) router.replace('/(tabs)');
        }
    };

    // APPLE & GOOGLE AUTH - Now enabled for production builds
    const signInWithGoogle = async () => {
        try {
            const redirectUrl = Linking.createURL('login-callback', { scheme: 'languagesoup' });
            console.log('Using Redirect URL:', redirectUrl);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUrl
                );

                if (result.type === 'success' && result.url) {
                    await setSessionFromUrl(result.url);
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    };

    // USERNAME AUTH (Proxy Email)
    const signUpWithUsername = async (username, password) => {
        try {
            const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanUsername.length < 3) throw new Error('Username must be at least 3 characters');

            const email = `${cleanUsername}@languagesoup.app`;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: username,
                        is_username_auth: true
                    }
                }
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Username signup error:', error);
            throw error;
        }
    };

    const signInWithUsername = async (username, password) => {
        try {
            const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
            const email = `${cleanUsername}@languagesoup.app`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Username login error:', error);
            throw error;
        }
    };

    // EMAIL AUTH - Active for Expo Go testing
    const signInWithMagicLink = async (email) => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Magic link error:', error);
            throw error;
        }
    };

    const verifyOtp = async (email, token) => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'email',
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('OTP verification error:', error);
            throw error;
        }
    };

    const signInWithName = async (displayName, emojiPassword) => {
        try {
            const targetName = displayName.trim();
            console.log('[Auth] Attempting login for:', targetName);

            // DATA MIGRATION HELPER
            const performDataVacuum = async (currentUserId, currentName) => {
                console.log('[Auth] Running Vacuum RPC for:', currentName);

                const { data: result, error } = await supabase
                    .rpc('execute_identity_migration', {
                        target_display_name: currentName
                    });

                if (error) {
                    console.error('[Auth] Vacuum RPC failed:', error);
                } else {
                    console.log('[Auth] Vacuum RPC result:', result);
                }
            };

            // Helper to generate a stable, safe internal email from any name
            const generateSafeEmail = (name) => {
                const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                // Simple stable hash
                let hash = 0;
                for (let i = 0; i < name.length; i++) {
                    const char = name.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash |= 0;
                }
                const hashStr = Math.abs(hash).toString(16);
                return `${clean || 'user'}_${hashStr}@internal.languagesoup.com`;
            };

            const internalEmail = generateSafeEmail(targetName);
            const internalPassword = `soup_${emojiPassword}_${targetName.length}`;
            console.log('[Auth] Generated Safe Email:', internalEmail);

            // Try to sign in with this identity
            let { data, error } = await supabase.auth.signInWithPassword({
                email: internalEmail,
                password: internalPassword,
            });
            console.log('[Auth] SignIn Result:', { user: data.user?.id, error: error?.message });

            // SUCCESSFUL LOGIN: Check if profile exists (Handle Zombie Auth)
            if (!error && data?.user) {
                const { data: profile } = await supabase
                    .from('app_users')
                    .select('id')
                    .eq('id', data.user.id)
                    .single();

                if (profile) {
                    await performDataVacuum(data.user.id, targetName);
                } else {
                    console.log('[Auth] 🧟 Zombie Auth (Auth exists, Profile missing). Claiming...', data.user.id);
                    // Re-create/Claim via RPC
                    const { data: claimResult, error: claimError } = await supabase
                        .rpc('claim_user_identity', {
                            target_display_name: targetName,
                            target_password: emojiPassword
                        });
                    if (claimError) console.error('[Auth] ❌ Claim RPC Error (Zombie):', claimError);
                }
            }

            // If user doesn't exist, create them!
            if (error && (error.status === 400 || error.message.includes('Invalid login credentials'))) {
                // Check if the display name is already taken by someone WITH a password
                const { data: existingProfiles } = await supabase
                    .from('app_users')
                    .select('id, emoji_password')
                    .ilike('display_name', targetName);

                // If ANY matching name has a DIFFERENT password, it's taken!
                const passwordConflict = existingProfiles?.find(m => m.emoji_password && m.emoji_password !== emojiPassword);
                if (passwordConflict) {
                    throw new Error('Name already taken!');
                }

                // Sign up as a new stable user
                const authResult = await supabase.auth.signUp({
                    email: internalEmail,
                    password: internalPassword,
                });

                if (authResult.error) throw authResult.error;
                data = authResult.data;

                // NEW SIGNUP: Call Atomic Claim/Create RPC
                const { data: claimResult, error: claimError } = await supabase
                    .rpc('claim_user_identity', {
                        target_display_name: targetName,
                        target_password: emojiPassword
                    });

                if (claimError) {
                    console.error('[Auth] Claim RPC Error:', claimError);
                } else {
                    console.log('[Auth] Identity Claim Result:', claimResult);
                }

                // Profile is definitely ready now
                setProfileChecked(true);

            } else if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Stable login failed:', error);
            throw error;
        }
    };

    const signInWithGuest = async () => {
        try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Guest login failed:', error);
            throw error;
        }
    };

    const signInWithPassword = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Password login failed:', error);
            throw error;
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            profileChecked,
            setBootScreenShown,
            signInWithName,
            signUpWithUsername,
            signInWithUsername,
            signInWithMagicLink,
            verifyOtp,
            signInWithGuest,
            signInWithPassword,
            signInWithGoogle,
            signOut
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
