import { useRootNavigationState, useRouter, useSegments } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { AppContext, getContext } from "../utils/context";
import { supabase } from "../utils/supabase";

export const useAuthProtection = (options: { ignoreRoutes?: string[], requiredContext?: AppContext } = {}) => {
    const router = useRouter();
    const segments = useSegments();
    const rootNavigationState = useRootNavigationState();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (!rootNavigationState?.key) return;

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                const currentRoute = segments[segments.length - 1];
                if (!options.ignoreRoutes?.includes(currentRoute)) {
                    setIsAuthorized(false);
                    if (rootNavigationState?.key) {
                        router.replace('/(auth)/login');
                    }
                }
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                // Re-verify context on session change
                checkSession();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [segments, rootNavigationState?.key]);

    const checkSession = async () => {
        try {
            const currentRoute = segments[segments.length - 1];
            if (options.ignoreRoutes?.includes(currentRoute)) {
                setIsLoading(false);
                setIsAuthorized(true);
                return;
            }

            // 1. Check for manual logout flag
            let manualLogout;
            if (Platform.OS !== 'web') {
                manualLogout = await SecureStore.getItemAsync('manual_logout');
            } else {
                manualLogout = localStorage.getItem('manual_logout');
            }

            if (manualLogout === 'true') {
                console.log('[AuthProtection] Manual logout detected');
                handleUnauthorized();
                return;
            }

            // 2. Check Supabase Session
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                console.log('[AuthProtection] No session or error');
                handleUnauthorized();
                return;
            }

            // 3. Verify Context and Role
            const currentContext = await getContext();

            if (options.requiredContext) {
                if (currentContext !== options.requiredContext) {
                    console.log(`[AuthProtection] Incorrect Context. Required: ${options.requiredContext}, Actual: ${currentContext}`);
                    // If wrong context, force redirect to appropriate place or login
                    // But wait, if they are admin logged in as user calling admin route, we should just block/redirect.
                    handleUnauthorized();
                    return;
                }

                if (options.requiredContext === 'admin') {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();

                    if (profile?.role !== 'super_admin') {
                        console.log('[AuthProtection] Not a super_admin');
                        handleUnauthorized();
                        return;
                    }
                }
            }

            // 4. Check Expiry Logic (Native Only for Biometrics)
            if (Platform.OS !== 'web') {
                const expiryStr = await SecureStore.getItemAsync('biometric_expiry');
                if (expiryStr) {
                    const expiryTime = parseInt(expiryStr, 10);
                    if (Date.now() > expiryTime) {
                        console.log("[AuthProtection] Session expired (24h limit)");
                        await performCleanup();
                        handleUnauthorized();
                        return;
                    }
                }
            }

            // If we are here, everything is good.
            setIsAuthorized(true);

        } catch (err) {
            console.error('[AuthProtection] Unexpected error:', err);
            handleUnauthorized();
        } finally {
            setIsLoading(false);
        }
    };

    const performCleanup = async () => {
        await supabase.auth.signOut();

        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('supabase_session');
            await SecureStore.deleteItemAsync('biometric_enabled');
            await SecureStore.deleteItemAsync('biometric_expiry');
            // Clean legacy keys just in case
            await SecureStore.deleteItemAsync('admin_supabase_session');
            await SecureStore.deleteItemAsync('admin_biometric_enabled');
            await SecureStore.deleteItemAsync('admin_biometric_expiry');
        } else {
            localStorage.removeItem('supabase_session');
            localStorage.removeItem('manual_logout');
            // Add others if needed
        }
    };

    const handleUnauthorized = () => {
        setIsAuthorized(false);
        setIsLoading(false);
        // Only redirect if we are not already in auth group
        const inAuthGroup = segments[0] === '(auth)';
        if (!inAuthGroup && rootNavigationState?.key) {
            // Wrap in setTimeout to avoid "Attempted to navigate before mounting Root Layout" error
            // This ensures the current render cycle completes before we trigger navigation
            setTimeout(() => {
                router.replace('/(auth)/login');
            }, 0);
        }
    };

    return { isLoading, isAuthorized };
};
