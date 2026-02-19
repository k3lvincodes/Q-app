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
                ...(relatedRequestId ? { idempotency_key: relatedRequestId } : {}),
            })
            .select()
            .single();

        if (txError) {
            console.error('Failed to insert transaction:', txError);
            return { success: false, error: txError.message };
        }

        // 2. Update User Balance
        // REMOVED: Managed by trg_apply_wallet on transactions table

        return { success: true, data: transaction };

    } catch (error: any) {
        console.error('Record Transaction Error:', error);
        return { success: false, error: error.message };
    }
};
