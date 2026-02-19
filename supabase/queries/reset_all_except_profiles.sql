-- Reset all public tables except profiles
-- Uses TRUNCATE to remove data and reset identities.
-- WARNING: This is destructive.

TRUNCATE TABLE
  public.gifts,
  public.invites,
  public.messages,
  public.notifications,
  public.requests,
  public.subscription_plans,
  public.subscription_services,
  public.support_messages,
  public.support_tickets,
  public.transactions,
  public.unique_codes,
  public.user_subscriptions
RESTART IDENTITY CASCADE;
