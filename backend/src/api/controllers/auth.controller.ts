import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

export const register = async (req: Request, res: Response) => {
  const { email, full_name } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({ error: 'Email and full_name are required.' });
  }

  if (full_name.trim().split(' ').length < 2) {
    return res.status(400).json({ error: 'Please enter your full name (at least two names).' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Check if user already exists
  const { data: existingUser, error: queryError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (queryError && queryError.code !== 'PGRST116') {
    console.error('Error checking user existence:', queryError);
    return res.status(500).json({ error: 'Internal server error checking user existence.' });
  }

  if (existingUser) {
    return res.status(409).json({ error: 'User already exists. Please login.' });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        full_name: full_name,
      },
    },
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ message: 'OTP sent successfully.' });
};

export const login = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ message: 'OTP sent successfully.' });
};

export const sendOtp = async (req: Request, res: Response) => {
  // Kept for backward compatibility if needed, otherwise can be removed or aliased
  return login(req, res);
};

export const verifyOtp = async (req: Request, res: Response) => {
  const { email, token, type, full_name } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'Email and OTP token are required.' });
  }

  // Default to email type if not provided, for security we might want to be strict
  // but let's allow what supabase supports if passed
  const otpType = (['signup', 'invite', 'recovery', 'magiclink', 'email'].includes(type)) ? type : 'email';

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email', // Force email type for standard OTP flow matching frontend
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data.session) {
    return res.status(400).json({ error: 'Verification failed. No session created.' });
  }

  // Handle Profile Updates for signup
  if (type === 'signup' && full_name) {
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: full_name }
    });

    if (updateError) {
      console.error('Error updating user name:', updateError);
    }
  }

  return res.status(200).json({
    message: 'Verification successful',
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
        user_metadata: data.session.user.user_metadata,
      }
    }
  });
};
