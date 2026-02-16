
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.EXTERNAL_API_KEY; // Ensure this matches what's in .env

if (!supabaseUrl || !supabaseServiceKey || !apiKey) {
    console.error('Missing env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXTERNAL_API_KEY)');
    process.exit(1);
}

// Admin client to setup test data
const adminSupabase = createClient(supabaseUrl!, supabaseServiceKey!);

const baseUrl = 'http://localhost:3000/api';
const testEmail = 'test_claimer@example.com';
const testPassword = 'securePassword123';
const giftCode = 'GIFT-' + Math.random().toString(36).substring(7).toUpperCase();

async function runTest() {
    console.log('--- Starting Gift Claim API Test ---');

    try {
        // 1. Create a Test User (if not exists)
        console.log('\n1. Setting up User...');
        // We can't easily create a user with a specific password via API without email confirm dev flow.
        // Instead, we will use a "Magic Link" / OTP login flow which returns a session, 
        // OR we just create a user via Admin API and get a session?
        // Let's use the /api/auth/login endpoint (OTP) but we can't intercept OTP.
        // ALTERNATIVE: Use Admin API to sign in as user? No, SignInWithPassword requires password.

        // Simpler: Just use Admin API to "signUp" with autoConfirm: true
        const { data: userData, error: userError } = await adminSupabase.auth.admin.createUser({
            email: testEmail,
            email_confirm: true,
            user_metadata: { full_name: 'Test Claimer' }
        });

        let userId = userData.user?.id;

        if (userError) {
            // If user already exists, fetch id
            if (userError.message.includes('already been registered')) {
                console.log('User already exists, fetching ID...');
                const { data: users } = await adminSupabase.auth.admin.listUsers();
                const existing = users.users.find(u => u.email === testEmail);
                if (existing) userId = existing.id;
            } else {
                throw userError;
            }
        }
        console.log(`User ID: ${userId}`);

        // Fund the user so they can send a gift
        await adminSupabase.from('profiles').update({ balance: 1000 }).eq('id', userId);
        console.log('Funded user with 1000.');

        // 2. Create a Gift (as Admin, pretending to be some sender)
        console.log(`\n2. Creating Gift ${giftCode}...`);

        // Get a sender ID (use same user for simplicity or specific one? Let's use same user as sender needed for DB constraints?)
        // Migration 008 says: INSERT INTO transactions (user_id... NEW.sender_id). 
        // So sender needs to be valid.

        const { error: giftError } = await adminSupabase
            .from('gifts')
            .insert({
                sender_id: userId, // Self-gifting for test simplicity
                amount: 100,
                currency: 'NGN',
                message: 'Test Gift',
                gift_code: giftCode,
                status: 'sent',
                total_amount: 105 // Assuming 5 fee
            });

        if (giftError) throw giftError;
        console.log('Gift created successfully.');

        // 3. Generate a Session Token for the User (to be the Claimer)
        // We can use admin.generateLink type: 'magiclink' or similar?
        // Or just signInWithPassword if we knew it?
        // Actually, we can use `adminSupabase.auth.startSession` if we have refresh token? No.
        // Let's just "fake" it by signing in with password if we set one?
        // admin.updateUserById(userId, { password: testPassword }) works.

        await adminSupabase.auth.admin.updateUserById(userId!, { password: testPassword });

        // Now sign in to get token (using public client would need anon key, we can use fetches request)
        // Or use `createClient(url, anonKey).auth.signInWithPassword`

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const publicClient = createClient(supabaseUrl!, serviceKey);

        const { data: sessionData, error: sessionError } = await publicClient.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });

        if (sessionError) throw sessionError;

        const accessToken = sessionData.session.access_token;
        console.log('Got Access Token.');

        // 4. Call Claim API
        console.log('\n3. Calling Claim API...');

        const res = await fetch(`${baseUrl}/gifts/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey!,
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                gift_code: giftCode
            })
        });

        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (res.status === 200 && data.success) {
            console.log('\nSUCCESS: Gift claimed!');

            // Verify earnings_balance
            const { data: profile, error: profileError } = await adminSupabase
                .from('profiles')
                .select('balance, earnings_balance')
                .eq('id', userId)
                .single();

            if (profileError) console.error('Error fetching profile:', profileError);
            else {
                console.log('User Profile After Claim:');
                console.log(`- Balance: ${profile.balance}`);
                console.log(`- Earnings Balance: ${profile.earnings_balance}`);
            }

        } else {
            console.error('\nFAILURE: Gift claim failed.');
        }

    } catch (err) {
        console.error('Test Error:', err);
    }
}

runTest();
