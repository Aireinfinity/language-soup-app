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
            // Redirect to login if not authenticated and trying to access protected route
            router.replace('/login');
        } else if (user) {
            // User is authenticated

            // Check cache first to avoid loops
            if (profileChecked) return;

            // Skip auto-redirect if user is in onboarding flow
            const inOnboardingFlow = currentRoute?.includes('onboarding') || currentRoute?.includes('login');

            // Only check profile and redirect from initial load, NOT from login/onboarding screens
            if (!currentRoute && !bootScreenShown && !inOnboardingFlow) {
                checkProfileAndRedirect(user, true, false, currentRoute);
            }
        }
    }, [user, loading, segments, profileChecked]);

    const checkProfileAndRedirect = async (currentUser, inAuthGroup, inOnboarding, currentRoute) => {
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
                    router.replace('/onboarding');
                }
            } else {
                setProfileChecked(true);
                // If profile exists, show boot screen once, then go to tabs
                if (inAuthGroup || inOnboarding) {
                    if (!bootScreenShown) {
                        setBootScreenShown(true);
                        // Only navigate to boot screen if not already there
                        if (currentRoute !== 'index') {
                            router.replace('/');
                        }
                    } else {
                        router.replace('/(tabs)');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking profile:', error);
            if (inAuthGroup) router.replace('/(tabs)');
        }
    };

    // GOOGLE AUTH - Commented out until Apple Developer account is approved
    // Uncomment when ready to use with TestFlight/Production builds
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

    const signInWithName = async (displayName) => {
        try {
            // Sign in anonymously (device-based auth)
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;

            // Create user profile with display name
            if (data.user) {
                const targetName = displayName.trim();
                // STRICT check for Founder Daddy
                const isAdmin = targetName === 'Noah :)';

                // 1. Check if this username already exists (to handle re-linking)
                const { data: existingUser } = await supabase
                    .from('app_users')
                    .select('id')
                    .eq('display_name', targetName)
                    .single();

                if (existingUser && isAdmin) {
                    // RE-LINKING LOGIC:
                    // If 'Noah :)' exists, we assume it's YOU trying to get back in.
                    // We need to update the OLD record to point to your NEW anonymous ID.
                    // Note: This requires RLS policies to allow updating "other" users or service role usage.
                    // Since we are client-side, we might hit RLS issues unless we are careful.
                    // HACK: For now, we unfortunately can't swap IDs easily without backend logic.
                    // ALTERNATIVE: We delete the old row first so the new upsert works.
                    await supabase
                        .from('app_users')
                        .delete()
                        .eq('display_name', targetName);
                }

                const { error: profileError } = await supabase
                    .from('app_users')
                    .upsert({
                        id: data.user.id,
                        display_name: targetName,
                        is_admin: isAdmin,
                        is_community_manager: isAdmin,
                        avatar_url: `https://api.dicebear.com/7.x/avataaars/png?seed=${data.user.id}`,
                        status_text: 'Hey there! I am using Language Soup',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

                if (profileError) {
                    console.warn('Profile creation error:', profileError);
                }
            }

            return data;
        } catch (error) {
            console.error('Name login failed:', error);
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
