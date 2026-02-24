const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing — Stripe needs the raw body for signature verification
module.exports.config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Require both webhook secret and signature — no bypass
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const subscriptionId = session.subscription;

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          await supabase.from('subscriptions').upsert({
            user_id: userId,
            plan: 'pro',
            status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: subscription.items.data[0]?.price?.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            plan: subscription.status === 'active' ? 'pro' : 'free',
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0]?.price?.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (userId) {
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            plan: 'free',
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
};
