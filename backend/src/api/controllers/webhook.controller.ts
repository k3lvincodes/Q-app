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

    if (event.event === 'charge.success') {
        const { reference, amount, customer, channel, paid_at, metadata } = event.data;
        const email = customer.email;
        const amountInNaira = amount / 100; // Paystack sends amount in kobo

        try {
            // 1. Find User by Email
            const { data: userData, error: userError } = await supabase
                .from('profiles') // Assuming profiles has email, if not use auth via some admin way or metadata
                .select('id, balance')
                .eq('email', email) // Ensure your profiles table has an email field sync'd from auth
                .single();

            // Fallback: If profile doesn't have email column, we might need to rely on metadata passing user_id
            // For now, let's assume we can get user_id from metadata if passed, or email lookup
            let userId = userData?.id;

            if (!userId) {
                // Check if we passed user_id in metadata during initialization
                if (metadata && metadata.user_id) {
                    userId = metadata.user_id;
                } else {
                    // Try to lookup in auth.users? (Not directly accessible via client usually)
                    // We return 200 to acknowledge webhook but log error
                    console.error(`User not found for email: ${email}`);
                    return res.sendStatus(200);
                }
            }

            // 2. Check if transaction already exists
            const { data: existingTx } = await supabase
                .from('transactions')
                .select('id')
                .eq('related_request_id', reference) // Using related_request_id as storage for reference for now, or add a 'reference' column
                // Best practice: Add a 'reference' column to transactions table. 
                // For now, let's assume 'description' might hold it or we add a row.
                // Actually, we should probably check if we have a transaction with this reference.
                // If the 'transactions' table doesn't have a unique reference column, we might duplicate.
                // Let's assume we can look up by description containing the reference if no dedicated column
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
                    // status: 'success', // If you added status column, otherwise omit
                });

            if (txError) {
                console.error('Failed to insert transaction:', txError);
                return res.sendStatus(500);
            }

            // 4. Update User Balance
            // REMOVED: Managed by trg_apply_wallet on transactions table
            console.log(`Successfully processed deposit of ₦${amountInNaira} for user ${userId}`);
            return res.sendStatus(200);

            console.log(`Successfully processed deposit of ₦${amountInNaira} for user ${userId}`);
            return res.sendStatus(200);

        } catch (error) {
            console.error('Webhook processing error:', error);
            return res.sendStatus(500);
        }
    }

    res.sendStatus(200);
};
