const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in Node 18+

const BASE_URL = 'http://localhost:8081'; // Standard Expo port

async function testAuth() {
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;

    console.log('--- Testing Registration ---');
    try {
        const res = await fetch(`${BASE_URL}/api/external/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                full_name: 'Test User'
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);
    } catch (e) {
        console.error('Registration failed:', e.message);
    }

    console.log('\n--- Testing Login ---');
    try {
        const res = await fetch(`${BASE_URL}/api/external/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);
    } catch (e) {
        console.error('Login failed:', e.message);
    }

    console.log('\n--- Testing Verify OTP (Invalid Code) ---');
    try {
        const res = await fetch(`${BASE_URL}/api/external/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testEmail,
                token: '000000', // Invalid token
                type: 'email'
            })
        });
        const data = await res.json();
        console.log(`Status: ${res.status}`);
        console.log('Response:', data);
        // 400 Bad Request is expected here due to invalid OTP, but confirms endpoint is reachable
    } catch (e) {
        console.error('Verify failed:', e.message);
    }
}

testAuth();
