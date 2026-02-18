import axios from 'axios';
import dotenv from 'dotenv';
import { supabase } from '../src/config/supabase';
dotenv.config();

const API_KEY = process.env.EXTERNAL_API_KEY || 'test-api-key';
const API_URL = 'http://localhost:3000/api';

async function main() {
    console.log('--- Starting Withdrawal Test ---');

    // 1. Get a test user
    const email = 'fehkelvink@gmail.com';
    // Fallback if fehkelvink doesn't exist, try getting any user
    let { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (!user) {
        console.log('fehkelvink not found, picking first user...');
        const { data: anyUser } = await supabase.from('profiles').select('*').limit(1).single();
        user = anyUser;
    }

    if (!user) {
        console.error('No users found in database.');
        return;
    }

    console.log(`Test User: ${user.email} (${user.id})`);
    console.log(`Initial Balance: ${user.balance}, Earnings: ${user.earnings_balance}`);

    // 2. Fund the user (ensure earnings > 100)
    const FUND_AMOUNT = 5000; // 5k
    if ((user.earnings_balance || 0) < 200) {
        console.log('Funding user for test...');
        await supabase
            .from('profiles')
            .update({ earnings_balance: FUND_AMOUNT, balance: FUND_AMOUNT })
            .eq('id', user.id);
        console.log(`Updated earnings to ${FUND_AMOUNT}`);
    }

    // 3. Initiate Withdraw
    const withdrawAmount = 100;
    console.log(`Initiating withdrawal of ${withdrawAmount}...`);

    try {
        const payload = {
            userId: user.id,
            amount: withdrawAmount,
            account_number: '0000000000', // Test account
            bank_code: '058', // GTBank
            account_name: 'Test Account',
            bank_name: 'GTBank'
        };

        const response = await axios.post(`${API_URL}/withdraw/initiate`, payload, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));

        if (response.status === 200 && response.data.data.reference) {
            console.log('SUCCESS: Withdrawal initiated.');

            // 4. Verify Transaction in DB
            const { data: tx } = await supabase
                .from('transactions')
                .select('*')
                .eq('related_request_id', response.data.data.reference)
                .single();

            if (tx) {
                console.log('SUCCESS: Transaction found in DB:', tx.id);
                console.log(`Tx Amount: ${tx.amount}, Type: ${tx.type}`);
            } else {
                console.error('FAILURE: Transaction NOT found in DB.');
            }

        } else {
            console.error('FAILURE: Unexpected response structure.');
        }

    } catch (error: any) {
        console.error('API Call Failed:', error.response?.data || error.message);
    }
}

main();
