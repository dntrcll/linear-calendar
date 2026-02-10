const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'Missing userEmail' });
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return res.status(404).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${req.headers.origin || 'https://timeline.solutions'}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    return res.status(500).json({ error: error.message });
  }
};
