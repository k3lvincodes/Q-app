import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not defined in environment variables.');
} else {
    console.log(`PAYSTACK_SECRET_KEY loaded: ${PAYSTACK_SECRET_KEY.substring(0, 8)}...`);
}

const paystackClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
    },
});

export const resolveAccount = async (accountNumber: string, bankCode: string) => {
    try {
        const response = await paystackClient.get(`/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error('Paystack Resolve Account Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'Could not resolve account details' };
    }
};

export const createTransferRecipient = async (name: string, accountNumber: string, bankCode: string) => {
    try {
        const response = await paystackClient.post('/transferrecipient', {
            type: 'nuban',
            name: name,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: 'NGN',
        });
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error('Paystack Create Recipient Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'Could not create transfer recipient' };
    }
};

export const initiateTransfer = async (amount: number, recipientCode: string, reference: string, reason: string) => {
    try {
        const response = await paystackClient.post('/transfer', {
            source: 'balance',
            amount: amount * 100, // Paystack expects amount in kobo
            recipient: recipientCode,
            reference: reference, // Ensure this is unique
            reason: reason,
        });
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error('Paystack Initiate Transfer Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'Could not initiate transfer' };
    }
};

export const initializeTransaction = async (email: string, amount: number, metadata?: any) => {
    try {
        const response = await paystackClient.post('/transaction/initialize', {
            email,
            amount: amount * 100, // Paystack expects amount in kobo
            metadata, // Pass metadata (e.g., user_id) for webhook to use
        });
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error('Paystack Initialize Transaction Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'Could not initialize transaction' };
    }
};

export const verifyTransaction = async (reference: string) => {
    try {
        const response = await paystackClient.get(`/transaction/verify/${reference}`);
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error('Paystack Verify Transaction Error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || 'Could not verify transaction' };
    }
};

export default {
    resolveAccount,
    createTransferRecipient,
    initiateTransfer,
    initializeTransaction,
    verifyTransaction,
};
