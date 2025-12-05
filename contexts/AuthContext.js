import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { useRouter, useSegments } from 'expo-router';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

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

    // Protected Route Logic
    useEffect(() => {
        // Handle deep links for Magic Link login
        const handleDeepLink = (event) => {
            let url = event.url;
            if (!url) return;

            // Parse the URL to see if it contains auth tokens
            // Supabase magic links usually come as: languagesoup://login-callback#access_token=...&refresh_token=...
            if (url.includes('access_token') && url.includes('refresh_token')) {
                const getParam = (name) => {
                    const regex = new RegExp(`[#?&]${name}=([^&]*)`);
                    const results = regex.exec(url);
                    return results ? decodeURIComponent(results[1]) : null;
                };

                const access_token = getParam('access_token');
                const refresh_token = getParam('refresh_token');

                if (access_token && refresh_token) {
                    supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    }).catch(err => console.error('Error setting session from URL:', err));
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        // Check for initial URL if app was opened via link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink({ url });
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Protected Route Logic & Profile Check
    useEffect(() => {
        if (loading) return;

        const currentRoute = segments[0];
        const publicRoutes = ['index', 'how-it-works', 'login', 'onboarding']; // onboarding needs to be accessible to create profile
        const isPublicRoute = publicRoutes.includes(currentRoute) || !currentRoute; // !currentRoute handles root path '/'

        if (!user && !isPublicRoute) {
            // Redirect to login if not authenticated and trying to access protected route
            router.replace('/login');
        } else if (user) {
            // User is authenticated

            // If on login or boot screen, check profile and redirect
            if (currentRoute === 'login' || currentRoute === 'index' || !currentRoute) {
                checkProfileAndRedirect(user, true, false);
            }
            // We allow staying on 'how-it-works' even if logged in, 
            // but 'onboarding' is handled by checkProfileAndRedirect logic
        }
    }, [user, loading, segments]);

    const checkProfileAndRedirect = async (currentUser, inAuthGroup, inOnboarding) => {
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
                // If profile exists, go to tabs (unless already there)
                if (inAuthGroup || inOnboarding) {
                    router.replace('/(tabs)');
                }
            }
        } catch (error) {
            console.error('Error checking profile:', error);
            // Fallback to tabs if error, to avoid getting stuck
            if (inAuthGroup) router.replace('/(tabs)');
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

    const signInWithMagicLink = async (email) => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                // No options = defaults to 6-digit OTP code
            });
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Magic link error:', error);
            throw error;
        }
    };

    const signInWithGuest = async () => {
        try {
            // For guest access, we'll create an anonymous user
            // In Supabase, we can enable anonymous sign-ins, or just create a random email/pass
            // For simplicity and speed without configuring Supabase dashboard right now,
            // we will create a random "guest" account.

            const guestId = Math.random().toString(36).substring(7);
            const email = `guest_${guestId}@languagesoup.app`;
            const password = `guest_${guestId}_secret`;

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Guest login failed:', error);
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
            signInWithGuest,
            signInWithMagicLink,
            verifyOtp,
            signOut
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
