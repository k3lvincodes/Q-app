import { Request, Response } from 'express';
import { getUserSupabase, supabase } from '../../config/supabase';

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
        // 1. Check if gift requires password using Admin Client
        // We need to know if password is required BEFORE calling the RPC that might fail
        const { data: gift, error: giftError } = await supabase
            .from('gifts')
            .select('unlock_password, unlock_hint, status')
            .eq('gift_code', gift_code)
            .single();

        if (giftError || !gift) {
            return res.status(404).json({ error: 'Gift not found' });
        }

        if (gift.status === 'claimed') {
            return res.status(400).json({ error: 'Gift already claimed' });
        }

        // 2. Check password requirement
        if (gift.unlock_password && !password) {
            return res.status(200).json({
                success: false,
                error: 'Password required',
                password_required: true,
                hint: gift.unlock_hint
            });
        }

        // 3. Create User-Scoped Supabase Client for the actual claim
        const userSupabase = getUserSupabase(token);

        // 4. Call the claim_gift RPC function
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

import { sendEmailResend } from '../../services/resend';
import { sendSMS } from '../../services/sendchamp';

export const sendGiftNotification = async (req: Request, res: Response) => {
    const { recipient_phone, recipient_email, recipient_name, sender_name, gift_type, gift_code, amount, channel } = req.body;
    const authHeader = req.headers.authorization;
    console.log('[DEBUG] /notify Auth Header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[DEBUG] /notify 401: Invalid Header Format');
        return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the token by getting the user
    const userSupabase = getUserSupabase(token);
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (authError || !user) {
        console.log('[DEBUG] /notify 401: Auth Failed', authError?.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    if (!gift_code) {
        return res.status(400).json({ error: 'Gift code is required' });
    }

    try {
        const formattedAmount = Number(amount).toLocaleString();
        const link = `https://joinq.ng/claim?${gift_code}`;
        // Ensure nice spacing: "Hello Name!" or "Hello!"
        const greeting = recipient_name ? `Hello ${recipient_name}!` : 'Hello!';
        const messageText = `${greeting} ${sender_name} just sent you a ${gift_type} gift worth NGN ${formattedAmount} on Q. Claim it here: ${link}`;
        const emailSubject = `You received a gift from ${sender_name}!`;
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h2>You've got a gift!</h2>
                <p>Hello ${recipient_name || 'there'},</p>
                <p><strong>${sender_name}</strong> sent you a <strong>${gift_type}</strong> worth <strong>NGN ${formattedAmount}</strong>.</p>
                <p>Click the link below to claim it:</p>
                <p><a href="${link}" style="display: inline-block; background-color: #EF5323; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Claim Gift</a></p>
                <p>Or use code: <strong>${gift_code}</strong></p>
            </div>
        `;

        let result;

        switch (channel) {
            case 'email':
                if (!recipient_email) return res.status(400).json({ error: 'Recipient email is required for Email' });
                result = await sendEmailResend(recipient_email, emailSubject, emailHtml);
                break;
            case 'sms':
            default:
                if (!recipient_phone) return res.status(400).json({ error: 'Recipient phone is required for SMS' });
                result = await sendSMS([recipient_phone], messageText);
                break;
        }

        if (!result.success) {
            console.error(`${channel || 'sms'} Notification Failed:`, result.error);
            return res.status(200).json({
                success: true,
                message: 'Gift created, but notification failed',
                provider_error: result.error
            });
        }

        return res.status(200).json({ success: true, message: 'Notification sent successfully', data: result.data });

    } catch (err: any) {
        console.error('Notification Error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
