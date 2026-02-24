const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGIN = 'https://timeline.solutions';

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

    // Use authenticated user's email — ignore client-supplied value
    const userEmail = authUser.email;

    // Find customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${ALLOWED_ORIGIN}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error.message);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
};
