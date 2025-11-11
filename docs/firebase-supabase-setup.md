# Firebase + Supabase Environment Variables Setup

This guide explains how to configure Supabase environment variables for Firebase Functions deployment.

## Problem

When deploying to Firebase Functions, environment variables from `.env.local` are **not automatically available**. Firebase Functions runs in a separate environment and needs its own configuration.

## Solution: Configure Firebase Functions Environment Variables

### Option 1: Firebase Functions Environment Variables (Recommended for v2)

Firebase Functions v2 uses environment variables directly via `process.env`. Set them using Firebase CLI:

```bash
# Set Supabase URL
firebase functions:config:set supabase.url="https://your-project.supabase.co"

# Set Supabase anon key
firebase functions:config:set supabase.anon_key="your_anon_key_here"

# Deploy functions
firebase deploy --only functions
```

**Note:** For Firebase Functions v2, you can also use the newer `--set-env-vars` flag:

```bash
firebase functions:config:set \
  supabase.url="https://your-project.supabase.co" \
  supabase.anon_key="your_anon_key_here"
```

### Option 2: Using `.env` files with Firebase Functions (v2)

Firebase Functions v2 supports reading from `.env` files during local development, but for production you still need to set them via Firebase CLI or Firebase Console.

### Option 3: Firebase Console (Alternative)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Functions** → **Configuration**
4. Add environment variables:
   - `supabase.url`: Your Supabase project URL
   - `supabase.anon_key`: Your Supabase anon key

## How It Works

The Supabase client factory (`lib/supabase-client.ts`) automatically detects the environment and reads configuration from:

1. **Client-side**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (injected at build time)
2. **Server-side (Next.js SSR)**: Same as client-side, reads from `NEXT_PUBLIC_*` env vars
3. **Firebase Functions**: 
   - First checks `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Falls back to `process.env.SUPABASE_URL` and `process.env.SUPABASE_ANON_KEY`
   - Finally checks legacy `functions.config().supabase.*` (for v1 functions)

## Verification

After deploying, verify your configuration:

```bash
# Check Firebase Functions config
firebase functions:config:get
```

You should see:

```json
{
  "supabase": {
    "url": "https://your-project.supabase.co",
    "anon_key": "your_anon_key_here"
  }
}
```

## Local Development

For local development, create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:** 
- Variables must have `NEXT_PUBLIC_` prefix to be available client-side
- Restart your dev server after updating `.env.local`
- Never commit `.env.local` to git

## Production Deployment Checklist

- [ ] Set Firebase Functions environment variables via CLI or Console
- [ ] Verify configuration with `firebase functions:config:get`
- [ ] Test Supabase connection in deployed function
- [ ] Check Firebase Functions logs for any Supabase connection errors
- [ ] Verify CORS settings in Supabase (allow your Firebase domain)

## Troubleshooting

### Supabase client not initialized in production

**Cause:** Environment variables not set in Firebase Functions.

**Fix:**
```bash
firebase functions:config:set supabase.url="..." supabase.anon_key="..."
firebase deploy --only functions
```

### CORS errors when accessing Supabase from Firebase domain

**Cause:** Supabase Storage policies or CORS settings don't allow your Firebase domain.

**Fix:**
1. Go to Supabase Dashboard → Project Settings → API
2. Add your Firebase domain to CORS settings:
   - `https://your-app.web.app`
   - `https://your-app.firebaseapp.com`

### Environment variables available in dev but not in production

**Cause:** `.env.local` is only for local development. Firebase Functions needs its own configuration.

**Fix:** Set environment variables in Firebase Functions as described above.

## Additional Resources

- [Firebase Functions Environment Configuration](https://firebase.google.com/docs/functions/config-env)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

