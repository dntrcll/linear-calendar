const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, userId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed', status: session.payment_status });
    }

    const subscription = session.subscription;
    const supabaseUserId = session.metadata?.supabase_user_id || userId;

    if (!supabaseUserId) {
      return res.status(400).json({ error: 'No user ID found' });
    }

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
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: 'Failed to update subscription', details: error.message });
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
    console.error('Verify session error:', error);
    return res.status(500).json({ error: error.message });
  }
};
