
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend folder
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = 'https://api.joinq.ng/api/gifts/claim';
const API_KEY = process.env.EXTERNAL_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GIFT_CODE = '2GIQ6VSN';
const PASSWORD = 'Kelvin';

async function testProd() {
    console.log('--- Testing Production Claim ---');
    console.log(`URL: ${API_URL}`);
    console.log(`Gift Code: ${GIFT_CODE}`);

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error("FATAL: Supabase config missing");
        return;
    }

    // Initialize Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Create a Test User (in Prod DB)
    const email = `prod_tester_${Date.now()}@example.com`;
    const userPwd = 'TestPassword123!';
    console.log(`Creating temp user: ${email}`);

    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: userPwd,
        email_confirm: true
    });

    if (createError || !user.user) {
        console.error('Failed to create user:', createError);
        return;
    }

    const userId = user.user.id;
    console.log('User created:', userId);

    try {
        // 2. Login to get Token
        const { data: sessionData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
            email,
            password: userPwd
        });

        if (loginError || !sessionData.session) {
            console.error('Failed to login:', loginError);
            return;
        }

        const token = sessionData.session.access_token;
        console.log('Got Access Token');

        // 3. Test: Send Request WITH Password immediately
        console.log('\n--- Attempt Claim WITH Password (Immediate) ---');
        try {
            const res = await axios.post(API_URL, {
                gift_code: GIFT_CODE,
                password: PASSWORD
            }, {
                headers: {
                    'x-api-key': API_KEY,
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`[PASS] Status: ${res.status}`);
            console.log('Body:', JSON.stringify(res.data, null, 2));

        } catch (e: any) {
            if (e.response) {
                console.log(`[FAIL] Status: ${e.response.status}`);
                console.log('Body:', e.response.data);
                console.log('Headers:', e.response.headers);
            } else {
                console.log('[FAIL] Error:', e.message);
            }
        }

    } finally {
        // Cleanup
        console.log('\nCleaning up user...');
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log('User deleted.');
    }
}

testProd();
