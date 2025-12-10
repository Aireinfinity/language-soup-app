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
        });

        return () => subscription.unsubscribe();
    }, []);

    const setSessionFromUrl = async (url) => {
        if (!url) return;

        try {
            // Parse Supabase URL (hash or query params)
            // Format: ...#access_token=...&refresh_token=...
            // Or: ...?access_token=...&refresh_token=...

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
    useEffect(() => {
        // Handle deep links for OAuth login (if browser redirects automatically)
        const handleDeepLink = (event) => {
            if (event.url) setSessionFromUrl(event.url);
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check for initial URL if app was opened via link
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
        const publicRoutes = ['index', 'how-it-works', 'login', 'onboarding']; // onboarding needs to be accessible to create profile
        const isPublicRoute = publicRoutes.includes(currentRoute) || !currentRoute; // !currentRoute handles root path '/'

        if (!user && !isPublicRoute) {
            // Redirect to login if not authenticated and trying to access protected route
            router.replace('/login');
        } else if (user) {
            // User is authenticated

            // Only check profile and redirect from login or when no route (initial load)
            // Don't redirect if already on boot screen (index) to prevent loops
            if (currentRoute === 'login' || (!currentRoute && !bootScreenShown)) {
                checkProfileAndRedirect(user, true, false, currentRoute);
            }
        }
    }, [user, loading, segments]);

    const checkProfileAndRedirect = async (currentUser, inAuthGroup, inOnboarding, currentRoute) => {
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
    /*
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
    */

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
            setBootScreenShown,
            signInWithMagicLink,
            verifyOtp,
            signInWithGuest,
            signInWithPassword,
            // signInWithGoogle, // Commented out - uncomment when using TestFlight
            signOut
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
