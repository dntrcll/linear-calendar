# Timeline OS - Complete Launch Guide

A step-by-step guide to launching your app. Complete each phase in order.

---

## Phase 1: Domain & Hosting Setup (Day 1)

### Step 1.1: Purchase a Domain
1. Go to [Namecheap](https://namecheap.com) or [Google Domains](https://domains.google)
2. Search for your domain (e.g., `timeline-os.com`, `timelineos.app`)
3. Purchase the domain (~$12/year for .com)
4. Note your domain name: `_________________`

### Step 1.2: Deploy to Vercel
1. Create account at [vercel.com](https://vercel.com)
2. Connect your GitHub account
3. In terminal, run:
   ```bash
   cd /Users/apple/Desktop/linear-calendar
   npm install -g vercel
   vercel login
   vercel
   ```
4. Follow prompts:
   - Set up and deploy? **Y**
   - Which scope? **Your account**
   - Link to existing project? **N**
   - Project name? **timeline-os**
   - Directory? **./**
   - Override settings? **N**

5. Note your deployment URL: `https://timeline-os.vercel.app`

### Step 1.3: Connect Custom Domain
1. In Vercel dashboard → Your project → Settings → Domains
2. Add your domain: `timeline-os.com`
3. Vercel will show DNS records to add
4. Go to your domain registrar's DNS settings
5. Add the records Vercel provides (usually A record or CNAME)
6. Wait 5-30 minutes for DNS propagation
7. Verify domain shows "Valid Configuration" in Vercel

---

## Phase 2: Supabase Configuration (Day 1-2)

### Step 2.1: Update Auth Redirect URLs
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update these fields:
   - **Site URL**: `https://timeline-os.com`
   - **Redirect URLs**: Add these (one per line):
     ```
     https://timeline-os.com/*
     https://timeline-os.com
     https://www.timeline-os.com/*
     http://localhost:3000/*
     ```
5. Click **Save**

### Step 2.2: Create Subscriptions Table
1. In Supabase Dashboard → **SQL Editor**
2. Click **New query**
3. Copy and paste the contents of:
   ```
   /Users/apple/Desktop/linear-calendar/.planning/migrations/010_subscriptions_table.sql
   ```
4. Click **Run**
5. Verify: Go to **Table Editor** → You should see `subscriptions` table

### Step 2.3: (Optional) Custom Supabase Domain
**Note**: Requires Supabase Pro plan ($25/month)

1. Go to **Settings** → **Custom Domains**
2. Add domain: `api.timeline-os.com`
3. Add DNS records as instructed
4. Update your `.env` file with new URL

---

## Phase 3: Environment Variables (Day 2)

### Step 3.1: Set Vercel Environment Variables
1. Go to Vercel Dashboard → Your project → **Settings** → **Environment Variables**
2. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `REACT_APP_SUPABASE_URL` | `https://zywodfjarbppgdgmvfxw.supabase.co` | All |
| `REACT_APP_SUPABASE_ANON_KEY` | (your anon key from Supabase) | All |

3. Click **Save**
4. Redeploy: Go to **Deployments** → Latest → **Redeploy**

---

## Phase 4: Google OAuth Verification (Day 2-3)

### Step 4.1: Complete OAuth Consent Screen
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**

4. Fill in **App Information**:
   - App name: `Timeline OS`
   - User support email: `your-email@gmail.com`
   - App logo: Upload a 120x120px PNG

5. Fill in **App Domain**:
   - Application home page: `https://timeline-os.com`
   - Application privacy policy: `https://timeline-os.com/privacy`
   - Application terms of service: `https://timeline-os.com/terms`

6. Add **Authorized domains**:
   - `timeline-os.com`
   - `supabase.co`

7. Click **Save and Continue**

### Step 4.2: Verify Domain Ownership
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property → Enter `timeline-os.com`
3. Choose **DNS verification**
4. Add the TXT record to your domain's DNS
5. Click **Verify**
6. Return to OAuth consent screen → Your domain should show as verified

### Step 4.3: Submit for Verification
1. In OAuth consent screen → Click **Prepare for verification**
2. Ensure all required fields are complete
3. Add scopes: `email`, `profile`, `openid`
4. Click **Submit for verification**
5. Google will email you within 2-4 weeks

**Note**: Until verified, only test users you've added can sign in. Add your email to test users.

---

## Phase 5: Stripe Payment Setup (Day 3-4)

### Step 5.1: Create Stripe Account
1. Go to [stripe.com](https://stripe.com) → Sign up
2. Complete business verification:
   - Business type
   - Business details
   - Bank account for payouts

### Step 5.2: Create Products
1. In Stripe Dashboard → **Products** → **Add product**

2. Create **Timeline Pro Monthly**:
   - Name: `Timeline Pro`
   - Description: `Full access to all Timeline OS features`
   - Price: `$9.99` / `month` / `recurring`
   - Click **Save product**
   - Note the Price ID: `price_________________`

3. Create **Timeline Pro Yearly**:
   - Same product → Add another price
   - Price: `$99.99` / `year` / `recurring`
   - Note the Price ID: `price_________________`

### Step 5.3: Get API Keys
1. Go to **Developers** → **API keys**
2. Note these keys:
   - Publishable key: `pk_live_________________`
   - Secret key: `sk_live_________________` (click to reveal)

### Step 5.4: Create Backend API
You need a simple backend for Stripe. Create these files in your project:

**Option A: Vercel Serverless Functions**

Create `/api/create-checkout-session.js`:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, userId, successUrl, cancelUrl } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      client_reference_id: userId,
      metadata: { userId }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

Create `/api/stripe-webhook.js`:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  const sig = req.headers['stripe-signature'];
  const buf = await buffer(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await supabase.from('subscriptions').upsert({
        user_id: session.client_reference_id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan: 'pro',
        status: 'active'
      });
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await supabase.from('subscriptions')
        .update({ status: 'canceled', plan: 'free' })
        .eq('stripe_subscription_id', subscription.id);
      break;
  }

  res.json({ received: true });
}
```

### Step 5.5: Add Stripe Environment Variables
In Vercel → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | (from Step 5.6) |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |
| `REACT_APP_STRIPE_PRO_PRICE_ID` | `price_...` (monthly) |
| `REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID` | `price_...` (yearly) |
| `SUPABASE_SERVICE_KEY` | (from Supabase Settings → API) |

### Step 5.6: Set Up Webhook
1. In Stripe → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://timeline-os.com/api/stripe-webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Click **Reveal** to get webhook signing secret
7. Add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

### Step 5.7: Configure Customer Portal
1. In Stripe → **Settings** → **Billing** → **Customer portal**
2. Enable:
   - ✅ Allow customers to update subscriptions
   - ✅ Allow customers to cancel subscriptions
   - ✅ Show invoice history
3. Save changes

---

## Phase 6: Final Testing (Day 4-5)

### Step 6.1: Test Auth Flows
- [ ] Google Sign In works
- [ ] Email Magic Link works (check spam folder)
- [ ] Email/Password Sign Up works
- [ ] Email/Password Sign In works
- [ ] Sign Out works

### Step 6.2: Test Payment Flows
1. Use Stripe test mode first (toggle in Stripe dashboard)
2. Test card: `4242 4242 4242 4242`, any future date, any CVC
- [ ] Start trial button works
- [ ] Upgrade to Pro works
- [ ] Stripe checkout completes
- [ ] Subscription appears in database
- [ ] Cancel subscription works

### Step 6.3: Test Core Features
- [ ] Create events
- [ ] Edit events
- [ ] Delete events
- [ ] Family sharing invite link
- [ ] Theme switching
- [ ] All settings work

### Step 6.4: Mobile Testing
- [ ] Test on iPhone Safari
- [ ] Test on Android Chrome
- [ ] All features work on mobile

---

## Phase 7: Launch Checklist (Day 5)

### Pre-Launch
- [ ] All tests passing
- [ ] Stripe in live mode (not test mode)
- [ ] Google OAuth submitted for verification
- [ ] Privacy Policy page accessible
- [ ] Terms of Service page accessible
- [ ] Error tracking set up (optional: Sentry)
- [ ] Analytics set up (optional: Google Analytics)

### Launch Day
1. Switch Stripe from test mode to live mode
2. Update any test price IDs to live price IDs
3. Verify all environment variables are for production
4. Redeploy to Vercel
5. Test one real purchase (refund yourself)
6. Announce launch! 🎉

---

## Quick Reference

### Your URLs
| Service | URL |
|---------|-----|
| Production Site | `https://timeline-os.com` |
| Vercel Dashboard | `https://vercel.com/dashboard` |
| Supabase Dashboard | `https://supabase.com/dashboard` |
| Stripe Dashboard | `https://dashboard.stripe.com` |
| Google Cloud Console | `https://console.cloud.google.com` |

### Support Resources
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs
- Vercel Docs: https://vercel.com/docs
- Google OAuth: https://developers.google.com/identity

---

## Troubleshooting

### "Safari can't open the page"
- Cause: Trying to access localhost from mobile
- Fix: Deploy to real domain, test on that

### Google shows "unverified app" warning
- Cause: OAuth not yet verified by Google
- Fix: Add yourself as test user, or wait for verification

### Stripe payments not reflecting in database
- Cause: Webhook not set up correctly
- Fix: Check webhook endpoint URL, check Stripe webhook logs

### Email magic links not arriving
- Cause: Emails going to spam, or Supabase email limits
- Fix: Check spam, or set up custom SMTP in Supabase

---

*Created: February 2026*
*Timeline OS v1.0.0*
