const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const paystack = axios.create({
    baseURL: 'https://api.paystack.co',
    headers: { Authorization: `Bearer ${SECRET_KEY}` }
});

async function run() {
    try {
        console.log('Fetching banks...');
        const res = await paystack.get('/bank?country=nigeria&perPage=100');
        const banks = res.data.data.map(b => ({
            label: b.name,
            value: b.code
        }));

        let content = 'export const NIGERIAN_BANKS = [\n';
        banks.sort((a, b) => a.label.localeCompare(b.label)).forEach(b => {
            content += `    { label: "${b.label}", value: "${b.value}" },\n`;
        });
        content += '];\n';

        // Output to ../../utils/nigerianBanks.ts (frontend)
        const outputPath = path.resolve(__dirname, '../../utils/nigerianBanks.ts');
        fs.writeFileSync(outputPath, content);
        console.log(`Bank list written to ${outputPath}`);

    } catch (error) {
        console.error('Error fetching banks:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

run();
