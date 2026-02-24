const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verify Supabase JWT from Authorization header
const verifyAuth = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  const authSupabase = createClient(
    process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await authSupabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Fail if service role key is not configured
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Verify authentication
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Use ONLY the metadata user ID — never trust client-supplied userId
    const supabaseUserId = session.metadata?.supabase_user_id;

    if (!supabaseUserId) {
      return res.status(400).json({ error: 'No user ID in session metadata' });
    }

    // Verify the authenticated user matches the session owner
    if (supabaseUserId !== authUser.id) {
      return res.status(403).json({ error: 'Session does not belong to authenticated user' });
    }

    const subscription = session.subscription;

    // Update Supabase with the subscription info
    const { error } = await supabase.from('subscriptions').upsert({
      user_id: supabaseUserId,
      plan: 'pro',
      status: 'active',
      stripe_customer_id: session.customer,
      stripe_subscription_id: typeof subscription === 'string' ? subscription : subscription?.id,
      stripe_price_id: typeof subscription === 'object' ? subscription?.items?.data?.[0]?.price?.id : null,
      current_period_start: typeof subscription === 'object'
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: typeof subscription === 'object'
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      console.error('Supabase upsert error:', error.message);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.status(200).json({
      success: true,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: typeof subscription === 'object'
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error('Verify session error:', error.message);
    return res.status(500).json({ error: 'Failed to verify session' });
  }
};
