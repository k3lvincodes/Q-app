import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SENDCHAMP_API_URL = 'https://api.sendchamp.com/api/v1';
const SENDCHAMP_API_KEY = process.env.SENDCHAMP_API_KEY;

export const sendSMS = async (to: string[], message: string, sender_name = 'SendChamp') => {
    if (!SENDCHAMP_API_KEY) {
        console.warn('SENDCHAMP_API_KEY is not set. Skipping SMS.');
        return { success: false, error: 'Missing API Key' };
    }

    // Format phone numbers to 234...
    const formattedTo = to.map(phone => {
        let p = phone.replace(/\s+/g, ''); // Remove spaces
        if (p.startsWith('0')) return '234' + p.substring(1);
        if (p.startsWith('+234')) return p.substring(1);
        return p;
    });

    try {
        const response = await axios.post(
            `${SENDCHAMP_API_URL}/sms/send`,
            {
                to: formattedTo,
                message,
                sender_name,
                route: 'dnd'
            },
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SENDCHAMP_API_KEY}`
                }
            }
        );

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('SendChamp SMS Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
};

