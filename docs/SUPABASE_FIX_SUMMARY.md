# Supabase Firebase Functions Fix - Summary

## Problem

Supabase file access worked locally (`npm run dev`) but failed after build/deploy to Firebase Functions. This is a common issue with private Supabase buckets + SSR builds.

## Root Cause

The Supabase client was being created **at module load time**, which freezes environment variables at build time. In production (Firebase Functions), environment variables are resolved at runtime, not build time.

## Solution

Created a **runtime factory function** that creates the Supabase client when it's actually used, not when the module is loaded. This ensures environment variables are resolved correctly in all environments.

## Changes Made

### 1. Created `lib/supabase-client.ts`

A new factory module that:
- Creates Supabase clients at runtime (not module load time)
- Works in all environments:
  - **Client-side**: Reads from `NEXT_PUBLIC_*` env vars
  - **Server-side (Next.js SSR)**: Reads from `NEXT_PUBLIC_*` env vars
  - **Firebase Functions**: Reads from `NEXT_PUBLIC_*` env vars, non-prefixed vars, or Firebase Functions config
- Provides clear error messages if configuration is missing

### 2. Updated `lib/supabase.ts`

- Refactored to use the factory function
- Updated `uploadFileToSupabase()` and `getSignedUrl()` to use the factory
- Maintained backward compatibility with existing code
- Added lazy initialization for the legacy `supabase` export

### 3. Updated `components/EsriMap.tsx`

- Updated to use the factory function for better error handling
- Improved initialization logging

### 4. Created Documentation

- **`docs/firebase-supabase-setup.md`**: Comprehensive guide for setting up Supabase with Firebase Functions
- **Updated `README.md`**: Added troubleshooting section and links to setup guide

## How It Works

### Environment Variable Resolution Priority

1. **`NEXT_PUBLIC_SUPABASE_URL`** / **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (available everywhere after build)
2. **`SUPABASE_URL`** / **`SUPABASE_ANON_KEY`** (server-side only)
3. **Firebase Functions config** (`functions.config().supabase.*`) (legacy v1 functions only)

### Client Creation

The factory function `getSupabaseClient()`:
- Checks configuration availability before creating client
- Creates client only when called (runtime, not build time)
- Throws clear error if configuration is missing
- Works identically in dev, build, and production

## Setup Instructions

### Local Development

1. Create `.env.local` in project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

2. Restart dev server after updating `.env.local`

### Firebase Functions Deployment

1. Set environment variables in Firebase Functions:
   ```bash
   firebase functions:config:set \
     supabase.url="https://your-project.supabase.co" \
     supabase.anon_key="your_anon_key_here"
   ```

2. Deploy:
   ```bash
   npm run build
   firebase deploy
   ```

See [Firebase + Supabase Setup Guide](firebase-supabase-setup.md) for detailed instructions.

## Testing

### Local Production Build Test

```bash
npm run build
npm run start
```

This should work without errors and Supabase file operations should work correctly.

### Verify Configuration

```bash
# Check Firebase Functions config
firebase functions:config:get
```

## Benefits

1. ✅ **Works in all environments**: Dev, build, and production
2. ✅ **Runtime configuration**: Environment variables resolved at runtime, not build time
3. ✅ **Clear error messages**: Helpful error messages if configuration is missing
4. ✅ **Backward compatible**: Existing code continues to work
5. ✅ **Type-safe**: Full TypeScript support
6. ✅ **Firebase Functions ready**: Automatically detects and uses Firebase Functions config

## Next Steps

1. Set Firebase Functions environment variables (see setup guide)
2. Test local production build: `npm run build && npm run start`
3. Deploy to Firebase: `firebase deploy`
4. Verify Supabase file access in production
5. Check Firebase Functions logs if issues persist

## Troubleshooting

### Build Warning: "Module not found: Can't resolve 'firebase-functions'"

This warning is **harmless** and expected. The `firebase-functions` module is only available in Firebase Functions runtime, not during Next.js build. The code handles this gracefully with try-catch.

### Supabase client not initialized in production

**Cause:** Environment variables not set in Firebase Functions.

**Fix:** Set environment variables using `firebase functions:config:set` (see setup guide).

### CORS errors

**Cause:** Supabase Storage policies don't allow your Firebase domain.

**Fix:** Add your Firebase domain to Supabase CORS settings:
- `https://your-app.web.app`
- `https://your-app.firebaseapp.com`

## Files Changed

- `lib/supabase-client.ts` (new)
- `lib/supabase.ts` (updated)
- `components/EsriMap.tsx` (updated)
- `README.md` (updated)
- `docs/firebase-supabase-setup.md` (new)
- `docs/SUPABASE_FIX_SUMMARY.md` (this file)

## Related Issues

- Supabase file access works locally but fails in production
- Environment variables not available in Firebase Functions
- Supabase client initialized at build time instead of runtime

