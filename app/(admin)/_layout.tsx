import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAuthProtection } from '../../hooks/useAuthProtection';
import { supabase } from '../../utils/supabase';

export default function AdminLayout() {
    const { isLoading, isAuthorized } = useAuthProtection({ requiredContext: 'admin' });

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
                if (session && session.user) {
                    // Update unified session if biometrics are enabled
                    // Update unified session if biometrics are enabled (Native Only)
                    if (Platform.OS !== 'web') {
                        const bioEnabled = await SecureStore.getItemAsync('biometric_enabled');
                        if (bioEnabled === 'true') {
                            await SecureStore.setItemAsync('supabase_session', JSON.stringify({
                                access_token: session.access_token,
                                refresh_token: session.refresh_token,
                            }));
                        }
                    } else {
                        // Web: Update localStorage if needed
                        localStorage.setItem('supabase_session', JSON.stringify({
                            access_token: session.access_token,
                            refresh_token: session.refresh_token,
                        }));
                    }
                }
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    if (isLoading) {
        return (
            <View className="flex-1 bg-mainBg items-center justify-center">
                <ActivityIndicator size="large" color="#EB4219" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="users" />
            <Stack.Screen name="subscriptions" />
            <Stack.Screen name="support" />
            <Stack.Screen name="settings" />

            <Stack.Screen name="add-subscription" />
        </Stack>
    );
}
