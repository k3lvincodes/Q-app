import { Request, Response } from 'express';
import { getUserSupabase } from '../../config/supabase';

export const claimGift = async (req: Request, res: Response) => {
    const { gift_code, password } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    if (!gift_code) {
        return res.status(400).json({ error: 'Gift code is required' });
    }

    try {
        // 1. Create User-Scoped Supabase Client
        const userSupabase = getUserSupabase(token);

        // 2. Call the claim_gift RPC function
        // Note: The RPC function `claim_gift` (defined in migration 006)
        // internally uses `auth.uid()` which will be populated by the Bearer token.
        const { data, error } = await userSupabase.rpc('claim_gift', {
            p_gift_code: gift_code,
            p_password: password || null
        });

        if (error) {
            console.error('RPC Error:', error);
            return res.status(400).json({ error: error.message });
        }

        // The RPC returns { success: boolean, error?: string, ... }
        if (!data.success) {
            return res.status(400).json({ error: data.error });
        }

        return res.status(200).json(data);

    } catch (err: any) {
        console.error('Claim Gift Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
