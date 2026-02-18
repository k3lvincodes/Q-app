import { Request, Response } from 'express';
import { initializeTransaction, verifyTransaction } from '../../services/paystack';

export const initiateDeposit = async (req: Request, res: Response) => {
    const { email, amount, userId } = req.body;

    if (!email || !amount || !userId) {
        return res.status(400).json({ error: 'Missing required fields: email, amount, userId' });
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    try {
        const result = await initializeTransaction(email, Number(amount), { user_id: userId });

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to initialize transaction' });
        }

        const { reference, authorization_url, access_code } = result.data;

        return res.status(200).json({
            status: 'success',
            reference,
            authorization_url,
            access_code,
        });
    } catch (error: any) {
        console.error('Initiate Deposit Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

export const verifyDeposit = async (req: Request, res: Response) => {
    const { reference } = req.query;

    if (!reference || typeof reference !== 'string') {
        return res.status(400).json({ error: 'Missing required query param: reference' });
    }

    try {
        const result = await verifyTransaction(reference);

        if (!result.success) {
            return res.status(500).json({ error: result.error || 'Failed to verify transaction' });
        }

        const { status, amount, customer, channel, paid_at } = result.data;

        return res.status(200).json({
            status,
            message: status === 'success' ? 'Transaction verified successfully' : `Transaction status: ${status}`,
            amount: amount / 100, // Convert from kobo to naira
            customer,
            channel,
            paid_at,
        });
    } catch (error: any) {
        console.error('Verify Deposit Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
