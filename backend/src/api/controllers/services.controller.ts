import { Request, Response } from 'express';
import { supabase } from '../../config/supabase';

export const getAllServices = async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('subscription_services')
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json(data);
};
// ... imports
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

// ... getAllServices ...

export const createService = async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    description,
    billing_cycle,
    renewal_day,
    credential_login_code,
    credential_email,
    image_url,
    plans
  } = req.body;

  if (!name || !plans || !Array.isArray(plans) || plans.length === 0) {
    return res.status(400).json({ error: 'Name and at least one plan are required.' });
  }

  try {
    // 1. Create Service
    const { data: service, error: serviceError } = await supabase
      .from('subscription_services')
      .insert({
        name,
        description,
        billing_cycle,
        renewal_day: parseInt(renewal_day),
        credential_login_code,
        credential_email,
        image_url
      })
      .select()
      .single();

    if (serviceError) throw serviceError;

    // 2. Create Plans
    const plansData = plans.map((p: any) => ({
      service_id: service.id,
      plan_type: p.type, // Map UI 'type' to DB 'plan_type'
      members_limit: parseInt(p.members), // Map UI 'members' to DB 'members_limit'
      price_per_member: parseFloat(p.price) // Map UI 'price' to DB 'price_per_member'
    }));

    const { error: plansError } = await supabase
      .from('subscription_plans')
      .insert(plansData);

    if (plansError) {
      // In a real app we might revert the service creation here
      throw plansError;
    }

    return res.status(201).json({ message: 'Service created successfully', serviceId: service.id });

  } catch (error: any) {
    console.error('Create Service Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create service' });
  }
};
