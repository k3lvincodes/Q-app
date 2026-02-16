
const apiKey = '6ece41f867d1956740303cb69af21b36abd355d563903207ed1d2bfedaa20715';
const baseUrl = 'http://localhost:3000/api/auth';
const email = 'testuser2@example.com';

async function testAuth() {
    console.log('Testing External Auth Flow...');

    // 1. Request OTP (Login)
    console.log(`\n1. Requesting OTP for ${email}...`);
    try {
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({ email })
        });

        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        console.log('Login Response:', JSON.stringify(loginData, null, 2));

        if (loginRes.status !== 200) {
            console.error('Login failed!');
            return;
        }

        console.log('OTP sent successfully. (Cannot proceed to verification without OTP interception)');
        console.log('External Client Capability: CONFIRMED for initiating auth.');

    } catch (error) {
        console.error('Error:', error);
    }
}

testAuth();
