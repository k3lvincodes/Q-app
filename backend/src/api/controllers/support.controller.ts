import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

export const createSupportTicket = async (req: Request, res: Response) => {
  const { email, subject, message, user_id } = req.body;

  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required.' });
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      email,
      subject,
      message,
      user_id, // This can be null
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // In a real application, you would also trigger an email notification
  // to your support team here.

  return res.status(201).json(data);
};
