import { supabase } from '../../config/supabase';

export const recalculateUserBalance = async (userId: string): Promise<number> => {
    try {
        // 1. Fetch all transactions for the user
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', userId);

        if (txError) {
            console.error('Error fetching transactions for balance sync:', txError);
            throw txError;
        }

        // 2. Calculate Balance
        let totalBalance = 0;
        if (transactions) {
            console.log(`[Balance Sync] Found ${transactions.length} transactions for user ${userId}:`);
            transactions.forEach((tx: any) => {
                console.log(` - ${tx.type}: ${tx.amount}`);
                if (tx.type === 'credit') {
                    totalBalance += tx.amount;
                } else if (tx.type === 'debit') {
                    totalBalance -= tx.amount;
                }
            });
        }

        // 3. Update Profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ balance: totalBalance })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating profile balance during sync:', updateError);
            throw updateError;
        }

        console.log(`[Balance Sync] User ${userId} balance synced to ${totalBalance}`);
        return totalBalance;

    } catch (error) {
        console.error('Balance Sync Failed:', error);
        // Return current profile balance as fallback or 0
        // But throwing might be safer to prevent operations on stale data
        throw error;
    }
};
