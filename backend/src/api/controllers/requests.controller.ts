import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { request_type, details } = req.body;

  if (!request_type) {
    return res.status(400).json({ error: 'request_type is required.' });
  }

  const { data, error } = await supabase
    .from('requests')
    .insert({
      user_id: user.id,
      request_type,
      details,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
};

export const getUserRequests = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};
