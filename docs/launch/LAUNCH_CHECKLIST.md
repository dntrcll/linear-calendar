# Timeline OS - Launch Checklist

## Overview
This document covers all steps needed to make Timeline OS production-ready.

---

## 1. Fix Sign-up/Email Authentication

### Issue
The "Safari can't open the page" error occurs because:
- Email magic links redirect to `localhost:3000`
- Mobile devices cannot access localhost

### Solution
Deploy to a real domain (Vercel, Netlify, or your own server).

**Steps:**
1. Deploy to Vercel:
   ```bash
   npm install -g vercel
   vercel
   ```

2. Update Supabase Redirect URLs:
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your production domain to:
     - Site URL: `https://your-domain.com`
     - Redirect URLs: `https://your-domain.com/*`

3. Update environment variables on your hosting platform:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

---

## 2. Custom Domain for Supabase (Replace Random URL)

### Current URL
`zywodfjarbppgdgmvfxw.supabase.co`

### Solution: Set up a Custom Domain

**Option A: Supabase Custom Domains (Pro Plan)**
1. Go to Supabase Dashboard → Settings → Custom Domains
2. Add your domain (e.g., `api.timeline.solutions`)
3. Configure DNS:
   - Add CNAME record pointing to Supabase
   - Supabase will provide the exact record

**Option B: Use Your Own API Proxy**
1. Set up a reverse proxy (Cloudflare, Nginx)
2. Proxy requests from `api.your-domain.com` to Supabase

**Update your app:**
```javascript
// .env.local
REACT_APP_SUPABASE_URL=https://api.timeline.solutions
```

---

## 3. Google Cloud OAuth Verification

### Why Needed
Google shows "unverified app" warning until your OAuth consent screen is verified.

### Steps to Verify

1. **Go to Google Cloud Console**
   - Navigate to: APIs & Services → OAuth consent screen

2. **Complete Application Information**
   - App name: Timeline OS
   - User support email: your-email@domain.com
   - App logo: 120x120px PNG
   - App home page: https://timeline.solutions
   - Privacy policy: https://timeline.solutions/privacy
   - Terms of service: https://timeline.solutions/terms

3. **Add Required Scopes**
   - `email`
   - `profile`
   - `openid`

4. **Domain Verification**
   - Verify your domain in Google Search Console
   - Add DNS TXT record for verification

5. **Submit for Verification**
   - Click "Prepare for verification"
   - Submit for Google review
   - Takes 2-4 weeks for approval

6. **Publish App**
   - Change status from "Testing" to "Production"

### Authorized Domains
Add to OAuth consent screen:
- `timeline.solutions`
- `supabase.co` (for auth callbacks)

---

## 4. Payment Gateway (Stripe) Setup

### Stripe Account Setup

1. **Create Stripe Account**
   - Go to: https://dashboard.stripe.com
   - Complete business verification

2. **Create Products & Prices**
   ```
   Product: Timeline Pro
   - Monthly: $9.99/month (price_xxx_monthly)
   - Yearly: $99.99/year (price_xxx_yearly)
   ```

3. **Get API Keys**
   - Dashboard → Developers → API keys
   - Copy Publishable key and Secret key

4. **Add Environment Variables**
   ```
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   STRIPE_SECRET_KEY=sk_live_xxx
   REACT_APP_STRIPE_PRO_PRICE_ID=price_xxx_monthly
   REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID=price_xxx_yearly
   ```

### Backend API Endpoints (Required)

Create these API routes (Vercel Functions, Express, etc.):

**`/api/create-checkout-session`**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { userId, priceId, successUrl, cancelUrl } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    metadata: { userId }
  });

  res.json({ sessionId: session.id, url: session.url });
}
```

**`/api/create-portal-session`**
```javascript
export default async function handler(req, res) {
  const { userId, returnUrl } = req.body;

  // Get customer ID from your database
  const customerId = await getStripeCustomerId(userId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  res.json({ url: session.url });
}
```

**`/api/stripe-webhook`**
```javascript
export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'checkout.session.completed':
      // Update subscription in database
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Update subscription status
      break;
  }

  res.json({ received: true });
}
```

### Stripe Dashboard Configuration

1. **Set up Webhooks**
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe-webhook`
   - Events to listen:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`

2. **Customer Portal**
   - Dashboard → Settings → Billing → Customer portal
   - Enable subscription management
   - Enable payment method updates
   - Enable invoice history

---

## 5. Database Migration

Run this SQL in Supabase SQL Editor to create the subscriptions table:

```sql
-- Located at: .planning/migrations/010_subscriptions_table.sql
-- Copy and run the entire file
```

---

## 6. Pre-Launch Checklist

### Security
- [ ] Enable RLS on all tables
- [ ] Review all policies
- [ ] Remove any hardcoded secrets
- [ ] Set up rate limiting

### Performance
- [ ] Enable Supabase connection pooling
- [ ] Set up CDN for static assets
- [ ] Optimize images

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics (Mixpanel, PostHog)
- [ ] Configure uptime monitoring

### Legal
- [ ] Privacy Policy page complete
- [ ] Terms of Service page complete
- [ ] Cookie consent banner (if needed for EU)
- [ ] GDPR compliance for EU users

### Testing
- [ ] Test all auth flows
- [ ] Test payment flows (use Stripe test mode)
- [ ] Test on mobile devices
- [ ] Test offline behavior
- [ ] Cross-browser testing

---

## 7. Environment Variables Summary

```bash
# Supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
REACT_APP_STRIPE_PRO_PRICE_ID=price_xxx
REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID=price_xxx

# Optional
REACT_APP_SENTRY_DSN=your-sentry-dsn
REACT_APP_GA_ID=G-xxxxxxxxxx
```

---

## 8. Deployment Commands

### Vercel
```bash
vercel --prod
```

### Netlify
```bash
netlify deploy --prod
```

### Docker
```bash
docker build -t timeline-os .
docker run -p 3000:3000 timeline-os
```

---

## Support

For issues, check:
- Supabase Discord: https://discord.supabase.com
- Stripe Support: https://support.stripe.com
- Google Cloud Support: https://cloud.google.com/support

---

*Last updated: February 2026*
