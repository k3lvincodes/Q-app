import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email functionality will be disabled.');
}

const resend = new Resend(RESEND_API_KEY);

export const sendEmailResend = async (to: string, subject: string, html: string, from = 'Q App <no-reply@joinq.ng>') => {
    if (!RESEND_API_KEY) {
        return { success: false, error: 'Missing RESEND_API_KEY' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from,
            to,
            subject,
            html,
        });

        if (error) {
            console.error('Resend Email Error:', error);
            return { success: false, error: error.message, details: error };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('Resend Exception:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
};
