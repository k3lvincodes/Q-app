require('dotenv').config({ path: 'backend/.env' });

const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in Node 18+

const BASE_URL = 'http://localhost:3000'; // Default backend port
const API_KEY = process.env.EXTERNAL_API_KEY;

if (!API_KEY) {
    console.error('Error: EXTERNAL_API_KEY not found in backend/.env');
    process.exit(1);
}

async function testAuth() {
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;

    console.log('--- Testing Backend Registration (With Key) ---');
    try {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            body: JSON.stringify({
                email: testEmail,
                full_name: 'Test Backend User'
            })
        });
        const data = await res.json(); // May fail if body is empty (e.g. 401/429 without json sometimes)
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);
    } catch (e) {
        console.error('Registration failed:', e.message);
    }

    console.log('\n--- Testing Backend Login (No Key - Should Fail) ---');
    try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail
            })
        });
        // Attempt to read JSON, but if 401/403 might come as text or json depending on implementation
        try {
            const data = await res.json();
            console.log(`Status: ${res.status}`);
            console.log('Response:', data);
        } catch {
            console.log(`Status: ${res.status}`);
            console.log('Response: (Not JSON)');
        }
    } catch (e) {
        console.error('Login failed:', e.message);
    }

    console.log('\n--- Testing Backend Rate Limit (With Key - Fast Loop) ---');
    // We already made 1 request. Let's make 6 more quickly to trigger limit (5 per 1 min)
    for (let i = 0; i < 6; i++) {
        try {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({ email: testEmail })
            });
            console.log(`Req ${i + 1}: Status ${res.status}`);
        } catch (e) {
            console.error(`Req ${i + 1} failed:`, e.message);
        }
    }

}

testAuth();
