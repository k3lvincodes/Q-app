import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';
import { createTransferRecipient, initiateTransfer, resolveAccount } from '../../services/paystack';
import { recalculateUserBalance } from '../utils/balanceUtils';
import { recordTransaction } from '../utils/transactionResponse';

export const initiateWithdraw = async (req: Request, res: Response) => {
    const { userId, amount, account_number, bank_code, account_name, bank_name } = req.body;

    if (!userId || !amount || !account_number || !bank_code) {
        return res.status(400).json({ error: 'Missing required fields: userId, amount, account_number, bank_code' });
    }

    if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    try {
        // 1. Verify User Exists
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('id, email, balance')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 2. Check Earnings Balance
        // We can either trust the profile balance or recalculate it.
        // For withdrawals, recalculating is safer to prevent double spending or sync issues.
        let currentBalance = await recalculateUserBalance(userId);

        // Ensure we are using the most conservative balance estimate
        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient earnings balance' });
        }

        // 3. Resolve Account (Verify Bank Details)
        // Ideally checking if the name matches what they provided, but for now we trust the resolve
        const resolveResult = await resolveAccount(account_number, bank_code);
        if (!resolveResult.success) {
            return res.status(400).json({ error: `Bank account verification failed: ${resolveResult.error}` });
        }

        const resolvedAccountName = resolveResult.data.account_name;

        // 4. Create Transfer Recipient
        const recipientResult = await createTransferRecipient(resolvedAccountName, account_number, bank_code);
        if (!recipientResult.success) {
            return res.status(500).json({ error: `Failed to create transfer recipient: ${recipientResult.error}` });
        }

        const recipientCode = recipientResult.data.recipient_code;

        // 5. Transaction Recording - PENDING STATE
        // We record the debit BEFORE initiating the transfer to "lock" the funds (logic-wise)
        // If transfer fails immediately, we can refund.
        // Using a unique reference for the transfer
        const reference = `wd_${Date.now()}_${userId.substring(0, 5)}`;

        const txResult = await recordTransaction(
            userId,
            amount,
            'debit',
            `Withdrawal to ${bank_name || bank_code} - ${account_number}`,
            reference // Storing reference in related_request_id or description if needed
        );

        if (!txResult.success) {
            return res.status(500).json({ error: 'Failed to record withdrawal transaction' });
        }

        // 6. Initiate Transfer
        const transferResult = await initiateTransfer(amount, recipientCode, reference, 'Withdrawal from Q App');

        if (!transferResult.success) {
            // CRITICAL: Transfer failed to initiate, but we already debited the user.
            // MUST REFUND.
            console.error(`Transfer initiation failed for ref ${reference}. Refunding user ${userId}...`);
            await recordTransaction(
                userId,
                amount,
                'credit',
                `Refund: Failed Withdrawal Initiation (${reference})`
            );
            return res.status(500).json({ error: `Withdrawal initiation failed: ${transferResult.error}` });
        }

        // 7. Success
        return res.status(200).json({
            message: 'Withdrawal initiated successfully',
            data: {
                reference: reference,
                status: 'success', // or pending, Paystack usually returns pending/success
                amount: amount,
                transfer_code: transferResult.data.transfer_code
            }
        });

    } catch (error: any) {
        console.error('Withdraw Initiation Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
