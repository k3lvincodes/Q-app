import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
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

        const { status, amount, customer, channel, paid_at, metadata } = result.data;
        const amountInNaira = amount / 100; // Convert from kobo to naira

        // If Paystack confirms success, credit the user's balance
        if (status === 'success') {
            // Use reference as idempotency_key to prevent double-crediting
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('id')
                .eq('idempotency_key', `deposit_${reference}`)
                .single();

            if (!existingTx) {
                // Determine user_id from metadata or by looking up the email
                let userId = metadata?.user_id;

                if (!userId && customer?.email) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('email', customer.email)
                        .single();
                    userId = profile?.id;
                }

                if (userId) {
                    const { error: txError } = await supabase
                        .from('transactions')
                        .insert({
                            user_id: userId,
                            amount: amountInNaira,
                            total: amountInNaira,
                            type: 'deposit_credit',
                            apply_mode: 'db',
                            description: `Deposit via ${channel || 'card'} (Ref: ${reference})`,
                            idempotency_key: `deposit_${reference}`,
                        });

                    if (txError) {
                        console.error('Failed to insert deposit transaction:', txError);
                    } else {
                        console.log(`✅ Deposit credited: ₦${amountInNaira} for user ${userId}`);
                    }
                } else {
                    console.error(`Could not determine user for deposit ref: ${reference}`);
                }
            } else {
                console.log(`Deposit ref ${reference} already credited, skipping.`);
            }
        }

        return res.status(200).json({
            status,
            message: status === 'success' ? 'Transaction verified successfully' : `Transaction status: ${status}`,
            amount: amountInNaira,
            customer,
            channel,
            paid_at,
        });
    } catch (error: any) {
        console.error('Verify Deposit Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
