import { supabase } from '../config/supabase';

const INTERVAL_MS = 5000; // 5 seconds

// This function will fetch all users and recalculate their balance
// Optimization: In a real production app, we would process this in batches or use a queue.
// For now, we iterating through all profiles is acceptable given the scale.
const updateBalances = async () => {
    // console.log('Running balance recalculation task...');

    try {
        // 1. Fetch all user IDs
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id');

        if (error) {
            console.error('Error fetching users for balance update:', error);
            return;
        }

        if (!users || users.length === 0) return;

        // 2. For each user, call the RPC function
        // We can do this concurrently
        const updates = users.map(async (user) => {
            const { error: rpcError } = await supabase.rpc('recalculate_balance', {
                user_uuid: user.id
            });

            if (rpcError) {
                console.error(`Failed to update balance for user ${user.id}:`, rpcError);
            }
        });

        await Promise.all(updates);
        // console.log(`Updated balances for ${users.length} users.`);

    } catch (err: any) {
        // Log error but don't crash
        if (err.cause && err.cause.code === 'UND_ERR_CONNECT_TIMEOUT') {
            console.error('Balance Scheduler: Connection timeout. Retrying next tick.');
        } else if (err.message && err.message.includes('fetch failed')) {
            console.error('Balance Scheduler: Fetch failed (Network/DNS). Retrying next tick.');
        } else {
            console.error('Unexpected error in balance scheduler:', err);
        }
    }
};

export const startBalanceScheduler = () => {
    console.log(`Starting Balance Scheduler (Every ${INTERVAL_MS}ms)`);
    setInterval(updateBalances, INTERVAL_MS);

    // Run immediately on start
    updateBalances();
};
