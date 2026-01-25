# OAuth Branding Guide: Changing from Supabase URL to Timeline.OS

## The Issue

When users click "Continue with Google", they see the ugly Supabase URL `zywodfjarbppgdgmvfxw.supabase.co` in the Google OAuth consent screen. This makes the app look unprofessional.

## Solutions

### Option 1: Update Google Cloud Console OAuth App (Quick & Free)

This is the easiest solution and doesn't require any code changes.

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your project (the one linked to your Supabase OAuth)

2. **Navigate to OAuth consent screen**
   - In the left menu: APIs & Services → OAuth consent screen

3. **Update App Information**
   - **App name**: Change to "Timeline.OS" (this is what users will see)
   - **App logo**: Upload your Timeline.OS logo (optional but recommended)
   - **Application home page**: Set to your production URL
   - **Privacy Policy** and **Terms of Service**: Add links if you have them

4. **Save and Publish**
   - Save changes
   - If in "Testing" mode, publish the app for production

**Result**: Users will see "Timeline.OS" instead of the Supabase URL in the consent screen.

---

### Option 2: Set up Custom Domain in Supabase (Advanced)

This completely replaces the Supabase URL with your own domain like `api.timeline.os` or `backend.timeline.os`.

1. **Purchase a domain** (if you don't have one)
   - Buy `timeline.os` or similar from a domain registrar

2. **Set up Custom Domain in Supabase**
   - Go to Supabase Dashboard → Settings → API
   - Under "Custom Domains", click "Add custom domain"
   - Enter your domain (e.g., `api.timeline.os`)
   - Follow the DNS configuration instructions

3. **Update DNS Records**
   - Add the CNAME record provided by Supabase to your domain's DNS
   - Wait for DNS propagation (can take up to 48 hours)

4. **Update Environment Variables**
   - Update `REACT_APP_SUPABASE_URL` in your `.env` file to use the new domain
   - Redeploy your app

5. **Update OAuth Settings**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add your custom domain to authorized redirect URLs

**Result**: Complete control over branding, no Supabase URLs visible anywhere.

---

## Recommended Approach

**Start with Option 1** (Google Cloud Console update) - it's:
- ✅ Free
- ✅ Quick (5 minutes)
- ✅ No code changes needed
- ✅ Fixes the main branding issue

**Upgrade to Option 2 later** if you want:
- Complete control over the API domain
- Professional branding everywhere
- Custom SSL certificates
- Better SEO and brand recognition

---

## Quick Checklist for Option 1

- [ ] Access Google Cloud Console
- [ ] Find your OAuth app configuration
- [ ] Change App Name to "Timeline.OS"
- [ ] Upload app logo (optional)
- [ ] Add homepage URL
- [ ] Save changes
- [ ] Test sign-in flow
- [ ] Verify users see "Timeline.OS" instead of Supabase URL

---

## Need Help?

If you need help finding your Google Cloud project:
1. Check your Supabase project settings
2. Look for "Google" in Authentication → Providers
3. Find the Client ID - this corresponds to your Google Cloud project
4. Use that Client ID to find the project in Google Cloud Console
