import { supabase } from '../supabaseClient';

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      maxEvents: 50,
      maxTags: 5,
      familySharing: false,
      advancedAnalytics: false,
      customThemes: false,
      focusMode: true,
      yearView: true,
      exportData: false,
      prioritySupport: false,
      offlineMode: false,
      multiDevice: false
    },
    description: 'Perfect for getting started'
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    yearlyPrice: 99.99,
    priceId: process.env.REACT_APP_STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    yearlyPriceId: process.env.REACT_APP_STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
    features: {
      maxEvents: -1, // unlimited
      maxTags: -1, // unlimited
      familySharing: true,
      advancedAnalytics: true,
      customThemes: true,
      focusMode: true,
      yearView: true,
      exportData: true,
      prioritySupport: true,
      offlineMode: true,
      multiDevice: true
    },
    description: 'For power users who want it all'
  }
};

// Trial Configuration
export const TRIAL_CONFIG = {
  durationDays: 14,
  features: SUBSCRIPTION_PLANS.PRO.features // Pro features during trial
};

// Feature Descriptions for UI
export const FEATURE_DESCRIPTIONS = {
  maxEvents: { label: 'Events', freeValue: '50', proValue: 'Unlimited' },
  maxTags: { label: 'Tags & Categories', freeValue: '5', proValue: 'Unlimited' },
  familySharing: { label: 'Family Sharing', freeValue: false, proValue: true },
  advancedAnalytics: { label: 'Advanced Analytics', freeValue: false, proValue: true },
  customThemes: { label: 'All Premium Themes', freeValue: false, proValue: true },
  focusMode: { label: 'Focus Mode', freeValue: true, proValue: true },
  yearView: { label: 'Year View', freeValue: true, proValue: true },
  exportData: { label: 'Export & Backup', freeValue: false, proValue: true },
  prioritySupport: { label: 'Priority Support', freeValue: false, proValue: true },
  offlineMode: { label: 'Offline Mode', freeValue: false, proValue: true },
  multiDevice: { label: 'Multi-Device Sync', freeValue: false, proValue: true }
};

// Get current subscription status
export const getSubscriptionStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      throw error;
    }

    if (!data) {
      // No subscription found - user is on free plan
      return {
        plan: 'free',
        status: 'active',
        trialActive: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        features: SUBSCRIPTION_PLANS.FREE.features
      };
    }

    // Check trial status
    const isTrialActive = data.trial_ends_at && new Date(data.trial_ends_at) > new Date();

    // Determine effective features
    let effectiveFeatures;
    if (isTrialActive || data.status === 'active') {
      effectiveFeatures = SUBSCRIPTION_PLANS[data.plan?.toUpperCase()]?.features || SUBSCRIPTION_PLANS.FREE.features;
    } else {
      effectiveFeatures = SUBSCRIPTION_PLANS.FREE.features;
    }

    return {
      plan: data.plan || 'free',
      status: data.status || 'inactive',
      trialActive: isTrialActive,
      trialEndsAt: data.trial_ends_at,
      currentPeriodEnd: data.current_period_end,
      cancelAtPeriodEnd: data.cancel_at_period_end || false,
      stripeCustomerId: data.stripe_customer_id,
      stripeSubscriptionId: data.stripe_subscription_id,
      features: effectiveFeatures
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return {
      plan: 'free',
      status: 'active',
      trialActive: false,
      features: SUBSCRIPTION_PLANS.FREE.features
    };
  }
};

// Start free trial
export const startFreeTrial = async (userId) => {
  try {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.durationDays);

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: 'pro',
        status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[Subscription] Trial started for user:', userId);
    return { data, error: null };
  } catch (error) {
    console.error('Error starting free trial:', error);
    return { data: null, error };
  }
};

// Create Stripe checkout session (call your backend)
export const createCheckoutSession = async (userId, priceId, isYearly = false) => {
  try {
    // In production, this would call your backend API
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        priceId,
        isYearly,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancel`
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { sessionId, url } = await response.json();
    return { sessionId, url, error: null };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { sessionId: null, url: null, error };
  }
};

// Create Stripe customer portal session (for managing subscription)
export const createPortalSession = async (userId) => {
  try {
    const response = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        returnUrl: `${window.location.origin}/settings`
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }

    const { url } = await response.json();
    return { url, error: null };
  } catch (error) {
    console.error('Error creating portal session:', error);
    return { url: null, error };
  }
};

// Check if user can use a feature
export const canUseFeature = (subscription, featureName) => {
  if (!subscription || !subscription.features) {
    return SUBSCRIPTION_PLANS.FREE.features[featureName] || false;
  }

  const featureValue = subscription.features[featureName];

  // Boolean features
  if (typeof featureValue === 'boolean') {
    return featureValue;
  }

  // Numeric features (-1 means unlimited)
  if (typeof featureValue === 'number') {
    return featureValue === -1 || featureValue > 0;
  }

  return false;
};

// Check if user has reached limit
export const hasReachedLimit = (subscription, featureName, currentCount) => {
  if (!subscription || !subscription.features) {
    const limit = SUBSCRIPTION_PLANS.FREE.features[featureName];
    return typeof limit === 'number' && limit !== -1 && currentCount >= limit;
  }

  const limit = subscription.features[featureName];

  // -1 means unlimited
  if (limit === -1) return false;

  // Check if current count exceeds limit
  return typeof limit === 'number' && currentCount >= limit;
};

// Get remaining usage for a feature
export const getRemainingUsage = (subscription, featureName, currentCount) => {
  if (!subscription || !subscription.features) {
    const limit = SUBSCRIPTION_PLANS.FREE.features[featureName];
    if (limit === -1) return Infinity;
    return Math.max(0, limit - currentCount);
  }

  const limit = subscription.features[featureName];

  if (limit === -1) return Infinity;
  return Math.max(0, limit - currentCount);
};

// Format trial days remaining
export const getTrialDaysRemaining = (trialEndsAt) => {
  if (!trialEndsAt) return 0;

  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const diffTime = trialEnd - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

// Cancel subscription (via Stripe portal)
export const cancelSubscription = async (userId) => {
  try {
    const { url, error } = await createPortalSession(userId);
    if (error) throw error;

    // Redirect to Stripe portal for cancellation
    window.location.href = url;
    return { error: null };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { error };
  }
};

// Local subscription management (for demo/development)
export const localSubscriptionManager = {
  // Store subscription in localStorage for demo
  getLocalSubscription: () => {
    try {
      const stored = localStorage.getItem('timeline_subscription');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  setLocalSubscription: (subscription) => {
    localStorage.setItem('timeline_subscription', JSON.stringify(subscription));
  },

  // Demo: Activate pro subscription
  activateProDemo: () => {
    const subscription = {
      plan: 'pro',
      status: 'active',
      trialActive: false,
      features: SUBSCRIPTION_PLANS.PRO.features,
      demoMode: true
    };
    localStorage.setItem('timeline_subscription', JSON.stringify(subscription));
    return subscription;
  },

  // Demo: Start trial
  startTrialDemo: () => {
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.durationDays);

    const subscription = {
      plan: 'pro',
      status: 'trialing',
      trialActive: true,
      trialEndsAt: trialEndsAt.toISOString(),
      features: TRIAL_CONFIG.features,
      demoMode: true
    };
    localStorage.setItem('timeline_subscription', JSON.stringify(subscription));
    return subscription;
  },

  // Demo: Reset to free
  resetToFree: () => {
    const subscription = {
      plan: 'free',
      status: 'active',
      trialActive: false,
      features: SUBSCRIPTION_PLANS.FREE.features,
      demoMode: true
    };
    localStorage.setItem('timeline_subscription', JSON.stringify(subscription));
    return subscription;
  }
};
