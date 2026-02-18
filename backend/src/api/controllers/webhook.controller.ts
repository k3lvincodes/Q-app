import crypto from 'crypto';
import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

export const handlePaystackWebhook = async (req: Request, res: Response) => {
    // Validate Paystack Signature
    const hash = crypto
        .createHmac('sha512', SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    // Handle Deposit
    if (event.event === 'charge.success') {
        const { reference, amount, customer, channel, metadata } = event.data;
        const email = customer.email;
        const amountInNaira = amount / 100; // Paystack sends amount in kobo

        try {
            // 1. Find User by Email
            const { data: userData } = await supabase
                .from('profiles')
                .select('id, balance')
                .eq('email', email)
                .single();

            let userId = userData?.id;

            if (!userId) {
                if (metadata && metadata.user_id) {
                    userId = metadata.user_id;
                } else {
                    console.error(`User not found for email: ${email}`);
                    return res.sendStatus(200);
                }
            }

            // 2. Check if transaction already exists
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('id')
                .eq('related_request_id', reference) // Using related_request_id as storage for reference for now, or add a 'reference' column
                .like('description', `%${reference}%`)
                .single();

            if (existingTx) {
                return res.sendStatus(200); // Already processed
            }

            // 3. Insert Transaction Record
            const { error: txError } = await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    amount: amountInNaira,
                    type: 'credit',
                    description: `Deposit via ${channel} (Ref: ${reference})`,
                });

            if (txError) {
                console.error('Failed to insert transaction:', txError);
                return res.sendStatus(500);
            }

            console.log(`Successfully processed deposit of ₦${amountInNaira} for user ${userId}`);
            return res.sendStatus(200);

        } catch (error) {
            console.error('Webhook processing error:', error);
            return res.sendStatus(500);
        }
    }

    // Handle Transfer (Withdrawal)
    else if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event.event)) {
        const { reference, _status, _recipient, amount, reason } = event.data;
        // const amountInNaira = amount / 100;

        console.log(`Processing transfer webhook: ${event.event} for Ref: ${reference}`);

    }

    res.sendStatus(200);
};
