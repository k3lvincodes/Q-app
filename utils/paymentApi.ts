import axios from 'axios';
import Constants from 'expo-constants';

const PAYMENT_API_URL = 'https://q-payment-api.vercel.app/api';

// Try multiple sources for the API key
const API_KEY =
    Constants.expoConfig?.extra?.QUORIX_API_KEY ||
    process.env.EXPO_PUBLIC_QUORIX_API_KEY ||
    process.env.QUORIX_API_KEY ||
    '';

export interface DepositResponse {
    status: string;
    reference: string;
    authorization_url: string;
    access_code: string;
}

export interface VerifyDepositResponse {
    status: 'success' | 'pending' | 'failed' | 'abandoned';
    message: string;
    amount?: number;
    customer?: {
        id: number;
        email: string;
        customer_code: string;
    };
    channel?: string;
    paid_at?: string;
}

export const verifyDeposit = async (reference: string): Promise<VerifyDepositResponse> => {
    console.log('Verifying deposit with reference:', reference);

    try {
        const response = await axios.get(
            `${PAYMENT_API_URL}/deposit/verify`,
            {
                params: { reference },
                headers: {
                    'x-api-key': API_KEY,
                },
            }
        );
        console.log('Verify API Response status:', response.status);
        console.log('Verify API Response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('Verify API Error:', error);
        if (axios.isAxiosError(error)) {
            console.error('Axios Error details:', error.response?.data);
            throw new Error(error.response?.data?.error || 'Failed to verify deposit');
        }
        throw error;
    }
};

export const initiateDeposit = async (email: string, amount: string, userId: string): Promise<DepositResponse> => {
    console.log('API Key loaded:', API_KEY ? `${API_KEY.substring(0, 5)}...` : 'EMPTY!');

    try {
        console.log(`Sending API request to: ${PAYMENT_API_URL}/deposit/initiate with email: ${email}, amount: ${amount}`);
        const response = await axios.post(
            `${PAYMENT_API_URL}/deposit/initiate`,
            { email, amount, userId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY,
                },
            }
        );
        console.log('API Response status:', response.status);
        console.log('API Response data:', response.data);
        return response.data;
    } catch (error) {
        console.error('API Error:', error);
        if (axios.isAxiosError(error)) {
            console.error('Axios Error details:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to initiate deposit');
        }
        throw error;
    }
};
