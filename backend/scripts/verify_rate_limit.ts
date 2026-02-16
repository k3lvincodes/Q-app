
const apiKey = '6ece41f867d1956740303cb69af21b36abd355d563903207ed1d2bfedaa20715';
const baseUrl = 'http://localhost:3000/api/auth';
const email = 'rate_limit_test@example.com';

async function testRateLimit() {
    console.log('Testing OTP Rate Limit (Expect 1 success, then fail)...');

    // 1. First Request (Should Succeed)
    console.log(`\n1. Request 1: ${email}`);
    try {
        const res1 = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({ email })
        });
        console.log(`Response 1: ${res1.status}`); // Expect 200
    } catch (e) { console.error(e); }

    // 2. Second Request (Should Fail)
    console.log(`\n2. Request 2: ${email} (Immediate retry)`);
    try {
        const res2 = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify({ email })
        });
        console.log(`Response 2: ${res2.status}`); // Expect 429

        if (res2.status === 429) {
            console.log('SUCCESS: Rate limit enforced.');
        } else {
            console.error('FAILURE: Rate limit NOT enforced.');
        }

    } catch (e) { console.error(e); }
}

testRateLimit();
