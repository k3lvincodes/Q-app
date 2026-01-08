import { supabase } from '../../config/supabase';

interface TransactionResult {
    success: boolean;
    data?: any;
    error?: string;
}

export const recordTransaction = async (
    userId: string,
    amount: number,
    type: 'credit' | 'debit',
    description: string,
    relatedRequestId?: string
): Promise<TransactionResult> => {
    try {
        // 1. Insert Transaction Record
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                amount: amount,
                type: type,
                description: description,
                related_request_id: relatedRequestId
            })
            .select()
            .single();

        if (txError) {
            console.error('Failed to insert transaction:', txError);
            return { success: false, error: txError.message };
        }

        // 2. Update User Balance
        // Calculate new balance delta
        const balanceChange = type === 'credit' ? amount : -amount;

        // Use RPC if available, else manual update
        const { error: rpcError } = await supabase
            .rpc('increment_balance', { user_id: userId, amount: balanceChange });

        if (rpcError) {
            // Fallback to manual update
            // Fetch current balance
            const { data: userData, error: fetchError } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', userId)
                .single();

            if (fetchError) {
                console.error('Failed to fetch user balance:', fetchError);
                return { success: false, error: 'Failed to update balance' };
            }

            const newBalance = (userData?.balance || 0) + balanceChange;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ balance: newBalance })
                .eq('id', userId);

            if (updateError) {
                console.error('Failed to manual update balance:', updateError);
                // Note: Transaction record exists but balance failed. Inconsistancy risk.
                return { success: false, error: 'Transaction recorded but balance update failed' };
            }
        }

        return { success: true, data: transaction };

    } catch (error: any) {
        console.error('Record Transaction Error:', error);
        return { success: false, error: error.message };
    }
};
