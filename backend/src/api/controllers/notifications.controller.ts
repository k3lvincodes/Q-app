import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getUserNotifications = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};

export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};
