import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('⚠️ Supabase environment variables are missing in server client!');
}

// Create a single supabase client for interacting with your database
// This client is for server-side API routes and does NOT use SecureStore
export const supabaseServer = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: false, // API routes are stateless
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    }
);
