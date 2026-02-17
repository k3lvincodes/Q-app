import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and Service Role Key must be provided.');
}

// Default admin client (service role)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to create a user-scoped client
export const getUserSupabase = (accessToken: string) => {
  // Use the anon key for user context, not service role
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'MISSING_ANON_KEY';

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
