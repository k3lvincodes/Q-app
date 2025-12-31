import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getUserSubscriptions = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      subscription_services (
        name,
        description,
        icon_url
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};

export const getSubscriptionById = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { id } = req.params;

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      subscription_services (
        *
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Subscription not found.' });
  }

  return res.status(200).json(data);
};

export const joinSubscription = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user;
  const { service_id, status = 'active' } = req.body;

  if (!service_id) {
    return res.status(400).json({ error: 'service_id is required.' });
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: user.id,
      service_id,
      status,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
};
