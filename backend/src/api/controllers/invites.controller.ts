import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { randomBytes } from 'crypto';

export const getInviteCode = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  // Check if user already has an active invite code
  let { data: existingCode, error: existingCodeError } = await supabase
    .from('invites')
    .select('code')
    .eq('inviter_id', user.id)
    .eq('status', 'pending')
    .single();

  if (existingCode) {
    return res.status(200).json({ code: existingCode.code });
  }

  // Generate a new unique code
  const code = randomBytes(4).toString('hex').toUpperCase();

  const { data, error } = await supabase
    .from('invites')
    .insert({
      inviter_id: user.id,
      code,
    })
    .select('code')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
};

export const redeemInviteCode = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user; // The user redeeming the code
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Invite code is required.' });
  }

  // Find the invite
  const { data: invite, error: inviteError } = await supabase
    .from('invites')
    .select('*')
    .eq('code', code)
    .eq('status', 'pending')
    .single();

  if (inviteError || !invite) {
    return res.status(404).json({ error: 'Invite code not found or already redeemed.' });
  }

  if (invite.inviter_id === user.id) {
    return res.status(400).json({ error: 'You cannot redeem your own invite code.' });
  }

  // Update the invite to redeemed status
  const { data, error } = await supabase
    .from('invites')
    .update({
      status: 'redeemed',
      invitee_id: user.id,
    })
    .eq('id', invite.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Here you could add logic to grant a bonus to the inviter or invitee

  return res.status(200).json({ message: 'Invite code redeemed successfully.', data });
};
