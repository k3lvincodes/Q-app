import { Response } from 'express';
import { supabase } from '../../config/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { recalculateUserBalance } from '../utils/balanceUtils';
import { recordTransaction } from '../utils/transactionResponse';

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
  const { service_id, plan_id, status = 'active', email } = req.body;

  if (!service_id) {
    return res.status(400).json({ error: 'service_id is required.' });
  }

  try {
    let price = 0;
    let serviceName = '';
    let planName = '';

    // 1. Fetch Price Details
    if (plan_id) {
      // If plan is selected, fetch plan price
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select(`
          price_per_member,
          plan_type,
          subscription_services (name)
        `)
        .eq('id', plan_id)
        .single();

      if (planError || !planData) {
        return res.status(404).json({ error: 'Subscription plan not found.' });
      }

      price = planData.price_per_member;
      serviceName = (planData.subscription_services as any)?.name || 'Service';
      planName = planData.plan_type;

    } else {
      // Fallback to service base price (legacy support)
      const { data: serviceData, error: serviceFetchError } = await supabase
        .from('subscription_services')
        .select('name, price')
        .eq('id', service_id)
        .single();

      if (serviceFetchError || !serviceData) {
        return res.status(404).json({ error: 'Service not found.' });
      }
      price = serviceData.price || 0;
      serviceName = serviceData.name;
    }

    // 2. Check User Balance
    // Sync balance from transactions first
    let currentBalance = 0;
    try {
      currentBalance = await recalculateUserBalance(user.id);
    } catch (syncError) {
      console.error('Balance sync failed, falling back to stored profile', syncError);
      const { data: userData } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();
      currentBalance = userData?.balance || 0;
    }

    console.log(`[DEBUG] User: ${user.id} | Balance: ${currentBalance} | Price: ${price} | Plan ID: ${plan_id}`);

    if (currentBalance < price) {
      return res.status(400).json({ error: 'Insufficient balance. Please deposit funds.' });
    }

    // 3. Record Transaction (PROCESS PAYMENT FIRST)
    // STRICT ORDER: Debit must be recorded before subscription is granted.
    const description = planName
      ? `Joined ${serviceName} (${planName})`
      : `Joined ${serviceName}`;

    const txResult = await recordTransaction(
      user.id,
      price,
      'debit',
      description
    );

    if (!txResult.success || !txResult.data) {
      return res.status(500).json({ error: 'Transaction failed: ' + txResult.error });
    }

    // 3.5 DOUBLE CHECK verification
    // User Requirement: "Never ever add user ... until you check that the debit transaction has been recorded"
    // We confirm the transaction physically exists in the DB.
    const { data: verifiedTx, error: verifyError } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', txResult.data.id)
      .single();

    if (verifyError || !verifiedTx) {
      console.error('CRITICAL: Transaction claimed success but could not be verified in DB.', txResult.data);
      return res.status(500).json({ error: 'Transaction verification failed. Subscription cancelled.' });
    }

    // 4. Create Subscription
    // Only happens if transaction recording was successful
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        service_id,
        plan_id: plan_id || null,
        status,
        // email can be stored if schema supports it, but not in current logical flow request
      })
      .select()
      .single();

    if (error) {
      // CRITICAL: Payment succeeded but sub failed. 
      // Refund the user immediately to maintain integrity.
      console.error('CRITICAL: Payment succeeded but subscription creation failed. Refunding user ' + user.id);

      // Attempt Refund
      await recordTransaction(
        user.id,
        price,
        'credit',
        `Refund: Failed Subscription Join ${serviceName}`
      );

      return res.status(500).json({ error: 'Subscription creation failed. You have been refunded.' });
    }

    return res.status(201).json(data);

  } catch (err: any) {
    console.error('Join Subscription Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
