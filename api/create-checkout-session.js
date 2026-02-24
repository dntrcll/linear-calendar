const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGIN = 'https://timeline.solutions';

// UUID v4 format validation
const isValidUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Verify Supabase JWT from Authorization header
const verifyAuth = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { priceId, isYearly } = req.body;

    // Use authenticated user's ID and email — ignore client-supplied values
    const userId = authUser.id;
    const userEmail = authUser.email;

    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid priceId' });
    }

    // Validate priceId looks like a Stripe price ID
    if (!priceId.startsWith('price_')) {
      return res.status(400).json({ error: 'Invalid priceId format' });
    }

    // Look up or create a Stripe customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${ALLOWED_ORIGIN}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ALLOWED_ORIGIN}/?payment=cancelled`,
      metadata: {
        supabase_user_id: userId,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
        },
      },
    });

    return res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
