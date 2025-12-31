import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export const performLogoutCleanup = async () => {
    try {
        // Set manual logout flag immediately to prevent auto-login race conditions
        if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync('manual_logout', 'true');
        } else {
            localStorage.setItem('manual_logout', 'true');
        }

        // Sign out from Supabase
        await supabase.auth.signOut();

        // keys to delete
        const keysToDelete = [
            'supabase_session',
            'admin_supabase_session',
            'biometric_enabled',
            'admin_biometric_enabled',
            'biometric_expiry',
            'admin_biometric_expiry',
            'user_email',
            'admin_user_email',
            'last_active',
            'authToken'
        ];

        if (Platform.OS !== 'web') {
            await Promise.all(keysToDelete.map(key => SecureStore.deleteItemAsync(key)));
        } else {
            keysToDelete.forEach(key => localStorage.removeItem(key));
        }

    } catch (error) {
        console.error('Error during logout cleanup:', error);
    }
};
