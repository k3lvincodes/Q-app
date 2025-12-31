import { createURL } from 'expo-linking';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession(); // Required for web browser redirect handling on some platforms

export const useGoogleAuth = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const redirectUrl = createURL('auth/callback'); // Using createURL instead of makeRedirectUri

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data.url) throw new Error('No redirect URL found');

            const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

            if (result.type === 'success' && result.url) {
                // Extract tokens from the URL
                // Supabase returns the tokens in the hash or query params depending on the flow
                // For mobile deep linking it's usually in the fragment part #access_token=...&refresh_token=...

                const params = new URLSearchParams(result.url.split('#')[1] || result.url.split('?')[1]);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (!accessToken || !refreshToken) {
                    // Fallback: Sometimes only check for #access_token if query/hash splitting fails
                    // But let's verify if we can just simpler setSession
                    throw new Error('No access token found in redirect URL');
                }

                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (sessionError) throw sessionError;

                if (sessionData.session) {
                    if (Platform.OS !== 'web') {
                        await SecureStore.setItemAsync('authToken', sessionData.session.access_token);
                        // Store full session for biometric login
                        await SecureStore.setItemAsync('supabase_session', JSON.stringify({
                            access_token: sessionData.session.access_token,
                            refresh_token: sessionData.session.refresh_token,
                        }));
                        // Enable biometric for future logins
                        await SecureStore.setItemAsync('biometric_enabled', 'true');
                        if (sessionData.user?.email) {
                            await SecureStore.setItemAsync('user_email', sessionData.user.email);
                        }
                    } else {
                        localStorage.setItem('authToken', sessionData.session.access_token);
                        localStorage.setItem('supabase_session', JSON.stringify({
                            access_token: sessionData.session.access_token,
                            refresh_token: sessionData.session.refresh_token,
                        }));
                        if (sessionData.user?.email) {
                            localStorage.setItem('user_email', sessionData.user.email);
                        }
                    }

                    router.replace("/(navbar)/dashboard");
                }
            } else if (result.type === 'cancel') {
                // User cancelled, do nothing or show message
                console.log("Google sign-in cancelled");
            }
        } catch (err: any) {
            console.error('Google Sign-In Error:', err);
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    return { handleGoogleLogin, loading, error };
};
