import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { recalculateUserBalance } from '../utils/balanceUtils';

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }

  // Sync balance before fetching
  try {
    await recalculateUserBalance(user.id);
  } catch (err) {
    console.error('Failed to sync balance on profile load:', err);
    // Continue properly even if sync fails, to show at least old data
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Profile not found.' });
  }

  return res.status(200).json(data);
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { full_name, avatar_url } = req.body;

  if (!user) {
    return res.status(401).json({ error: 'User not authenticated.' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name, avatar_url })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};
