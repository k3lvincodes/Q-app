import axios from 'axios';
import dotenv from 'dotenv';
import { supabase } from '../src/config/supabase';
dotenv.config();

const API_KEY = process.env.EXTERNAL_API_KEY || 'test-api-key';
const API_URL = 'http://localhost:3000/api';

async function main() {
    console.log('--- Starting Deposit Test ---\n');

    // 1. Get a test user from the database
    const email = 'fehkelvink@gmail.com';
    let { data: user } = await supabase
        .from('profiles')
        .select('id, email, balance')
        .eq('email', email)
        .single();

    if (!user) {
        console.log(`User ${email} not found, picking first available user...`);
        const { data: anyUser } = await supabase
            .from('profiles')
            .select('id, email, balance')
            .limit(1)
            .single();
        user = anyUser;
    }

    if (!user) {
        console.error('FAILURE: No users found in database. Cannot run test.');
        process.exit(1);
    }

    console.log(`Test User: ${user.email} (${user.id})`);
    console.log(`Current Balance: ${user.balance}\n`);

    // 2. Initiate a deposit
    const depositAmount = 100; // ₦100
    console.log(`Initiating deposit of ₦${depositAmount}...`);

    try {
        const response = await axios.post(
            `${API_URL}/deposit/initiate`,
            {
                email: user.email,
                amount: depositAmount,
                userId: user.id,
            },
            {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        const { status, reference, authorization_url, access_code } = response.data;

        // 3. Assert the response structure
        let allPassed = true;

        if (status === 'success') {
            console.log('\n✅ status: "success"');
        } else {
            console.error(`\n❌ status expected "success", got "${status}"`);
            allPassed = false;
        }

        if (reference) {
            console.log(`✅ reference: ${reference}`);
        } else {
            console.error('❌ reference is missing from response');
            allPassed = false;
        }

        if (authorization_url && authorization_url.startsWith('https://')) {
            console.log(`✅ authorization_url: ${authorization_url}`);
        } else {
            console.error(`❌ authorization_url is missing or invalid: ${authorization_url}`);
            allPassed = false;
        }

        if (access_code) {
            console.log(`✅ access_code: ${access_code}`);
        } else {
            console.error('❌ access_code is missing from response');
            allPassed = false;
        }

        if (allPassed) {
            console.log('\n🎉 SUCCESS: All deposit initiation assertions passed.');
        } else {
            console.error('\n💥 FAILURE: Some assertions failed. See above.');
        }

        // 4. (Optional) Verify the transaction reference
        if (reference) {
            console.log(`\nVerifying reference: ${reference}...`);
            try {
                const verifyResponse = await axios.get(
                    `${API_URL}/deposit/verify`,
                    {
                        params: { reference },
                        headers: { 'x-api-key': API_KEY },
                    }
                );
                console.log('Verify Response Status:', verifyResponse.status);
                console.log('Verify Response Data:', JSON.stringify(verifyResponse.data, null, 2));
                // A freshly created transaction will typically be "abandoned" or "pending"
                // since no payment has been made yet — that's expected.
                console.log(`ℹ️  Transaction status from Paystack: "${verifyResponse.data.status}" (expected for a fresh reference)`);
            } catch (verifyError: any) {
                console.error('Verify call failed:', verifyError.response?.data || verifyError.message);
            }
        }

    } catch (error: any) {
        console.error('\n💥 API Call Failed:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            console.error('Hint: Check that EXTERNAL_API_KEY in your .env matches the x-api-key header.');
        }
    }

    console.log('\n--- Deposit Test Complete ---');
}

main();
