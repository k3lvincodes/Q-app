import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type AppContext = 'user' | 'admin' | null;

const CONTEXT_KEY = 'active_context';

export const setContext = async (context: AppContext) => {
    if (Platform.OS !== 'web') {
        if (context) {
            await SecureStore.setItemAsync(CONTEXT_KEY, context);
        } else {
            await SecureStore.deleteItemAsync(CONTEXT_KEY);
        }
    } else {
        if (context) {
            localStorage.setItem(CONTEXT_KEY, context);
        } else {
            localStorage.removeItem(CONTEXT_KEY);
        }
    }
};

export const getContext = async (): Promise<AppContext> => {
    let context: string | null = null;

    if (Platform.OS !== 'web') {
        context = await SecureStore.getItemAsync(CONTEXT_KEY);
    } else {
        context = localStorage.getItem(CONTEXT_KEY);
    }

    // Validate context value
    if (context === 'user' || context === 'admin') {
        return context as AppContext;
    }

    return null;
};

export const clearContext = async () => {
    await setContext(null);
};
