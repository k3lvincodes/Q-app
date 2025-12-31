import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

export const sendOtp = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ message: 'OTP sent successfully.' });
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'Email and OTP token are required.' });
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ data });
};
