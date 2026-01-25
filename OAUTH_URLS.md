# OAuth Configuration URLs for Google Cloud Console

## Quick Reference

Copy these URLs into your Google Cloud Console OAuth consent screen:

### Application Home Page
```
https://linear-calendar.vercel.app
```
*(Replace with your actual Vercel deployment URL if different)*

To find your Vercel URL:
1. Go to https://vercel.com/dashboard
2. Find your `linear-calendar` project
3. Copy the production URL (usually ends in `.vercel.app`)

---

### Privacy Policy
```
https://linear-calendar.vercel.app/privacy
```

### Terms of Service
```
https://linear-calendar.vercel.app/terms
```

---

## Option 1: Quick Setup (Recommended for Now)

If you don't have Privacy Policy and Terms of Service pages yet, you can:

**Use placeholder URLs** - Google allows this for apps in "Testing" mode:
- Privacy Policy: `https://linear-calendar.vercel.app`
- Terms of Service: `https://linear-calendar.vercel.app`

Just use your homepage URL for both. You can update these later when you create proper pages.

---

## Option 2: Create Simple Legal Pages

I can create simple Privacy Policy and Terms of Service pages for you. These will be:
- ✅ Basic but compliant
- ✅ Standard for SaaS apps
- ✅ Easy to customize later

Would you like me to generate these pages?

---

## How to Update Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select your Timeline.OS project

2. **Navigate to OAuth consent screen**
   - Left menu: APIs & Services → OAuth consent screen

3. **Fill in the URLs**
   ```
   App name: Timeline.OS
   Application home page: https://linear-calendar.vercel.app
   Privacy Policy: https://linear-calendar.vercel.app/privacy
   Terms of Service: https://linear-calendar.vercel.app/terms
   ```

4. **Upload your logo**
   - Use the logo exported from `export-logo.html`
   - Recommended size: 512×512 or 1024×1024

5. **Save changes**

---

## Finding Your Vercel URL

If you're not sure what your Vercel URL is:

1. **Check Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **Or check your GitHub repo**
   - Go to: https://github.com/dntrcll/linear-calendar
   - Look for the "Deployments" section
   - Click on the latest deployment to see the URL

3. **Common formats**
   - `https://linear-calendar.vercel.app` (most common)
   - `https://linear-calendar-[username].vercel.app`
   - Or your custom domain if you've set one up

---

## Custom Domain (Optional)

If you want to use a custom domain like `timeline.app` or `timelineos.com`:

1. Buy the domain (Namecheap, Google Domains, etc.)
2. Add it to your Vercel project
3. Update the URLs above to use your custom domain

---

## Next Steps

1. ✅ Export your logo from `export-logo.html`
2. ✅ Find your Vercel deployment URL
3. ✅ Update Google Cloud Console with the URLs above
4. ✅ Upload your logo
5. ✅ Test the OAuth flow

**Need the Privacy/Terms pages created?** Let me know and I'll generate them for you!
