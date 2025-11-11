# Firebase Blaze Plan Setup Guide - UTILITX

## Overview

UTILITX now runs on **Firebase Blaze plan**, which unlocks:
- ✅ Outbound API calls from Functions (Supabase, Esri, GPT, Flask)
- ✅ Full SSR (Server-Side Rendering) support
- ✅ Dynamic routes (/share/[id], /contribute/[id], etc.)
- ✅ Unlimited HTTPS Functions

## Prerequisites

- [x] Firebase Blaze plan activated
- [x] Firebase CLI installed (`npm install -g firebase-tools`)
- [x] Firebase project initialized
- [x] Functions directory set up (`functions/src/index.ts`)

## Configuration Files

### 1. `functions/src/index.ts`

The SSR entrypoint for Next.js on Firebase Functions:
- Region: `us-central1` (optimal performance)
- Structured logging enabled
- Handles all routes via SSR
- Supports outbound API calls (requires Blaze plan)

### 2. `firebase.json`

Configuration for Firebase Hosting + Functions:
- All routes rewritten to `nextApp` function
- Static assets served from `public` directory
- Predeploy hook builds Next.js before deployment

### 3. `next.config.mjs`

**CRITICAL**: Must NOT use `output: 'export'`
- SSR mode is required
- Supports dynamic routes
- Enables API routes
- Required for Blaze plan networking

## Deployment Steps

### Step 1: Build Next.js App

```bash
npm run build
```

This creates the `.next` directory with the production build.

### Step 2: Deploy to Firebase

```bash
firebase deploy
```

This will:
1. Build Next.js (via predeploy hook)
2. Compile TypeScript in functions directory
3. Deploy Functions (nextApp)
4. Deploy Hosting configuration

### Step 3: Verify Deployment

1. **Visit your app URL**: `https://utilitx-pilot.web.app` (or your custom domain)
2. **Test Supabase file access**: Click "View Record" button
3. **Check Firebase Console → Functions → Logs → nextApp**
4. **Verify outbound API calls**: No 403 errors in logs

## Structured Logging

The `nextApp` function includes structured logging:

```typescript
functions.logger.info("Next.js SSR Request", {
  method: "GET",
  url: "/share/123",
  userAgent: "...",
  timestamp: "2024-..."
});

functions.logger.info("Next.js SSR Response", {
  method: "GET",
  url: "/share/123",
  status: 200,
  duration: "45ms",
  timestamp: "2024-..."
});
```

### Viewing Logs

```bash
# View real-time logs
firebase functions:log

# View logs for specific function
firebase functions:log --only nextApp

# View logs in Firebase Console
# Firebase Console → Functions → Logs → nextApp
```

## Environment Variables

### Local Development

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_ARCGIS_API_KEY=your_arcgis_key_here
```

### Firebase Functions (Production)

Set environment variables in Firebase Functions:

```bash
firebase functions:config:set \
  supabase.url="https://your-project.supabase.co" \
  supabase.anon_key="your_anon_key_here"
```

See [Firebase + Supabase Setup Guide](firebase-supabase-setup.md) for detailed instructions.

## Troubleshooting

### Outbound API Calls Blocked

**Symptoms**: 403 errors when calling Supabase, Esri, GPT, or Flask APIs

**Cause**: Spark plan doesn't allow outbound API calls

**Fix**: Upgrade to Blaze plan in Firebase Console

### Static Export Errors

**Symptoms**: "next start does not work with output: export"

**Cause**: `output: 'export'` in `next.config.mjs`

**Fix**: Remove `output: 'export'` - SSR is required for Firebase Functions

### Routes Not Working

**Symptoms**: 404 errors for dynamic routes

**Cause**: `firebase.json` not rewriting to `nextApp` function

**Fix**: Ensure `rewrites` section routes `**` to `nextApp`:

```json
{
  "rewrites": [
    { "source": "**", "function": "nextApp" }
  ]
}
```

### Function Cannot Find .next Directory

**Symptoms**: Function fails to start or returns 500 errors

**Cause**: `.next` directory not accessible to function

**Fix**: 
1. Ensure `npm run build` runs before deployment
2. Check that `predeploy` hook in `firebase.json` builds Next.js
3. Verify `.next` directory exists in project root after build

## Verification Checklist

- [ ] Firebase Blaze plan activated
- [ ] `functions/src/index.ts` uses SSR setup with region `us-central1`
- [ ] `firebase.json` rewrites all routes to `nextApp`
- [ ] `next.config.mjs` does NOT use `output: 'export'`
- [ ] Environment variables set in Firebase Functions
- [ ] `npm run build` succeeds
- [ ] `firebase deploy` succeeds
- [ ] App loads at hosted URL
- [ ] Supabase file access works (View Record button)
- [ ] Firebase Functions logs show successful requests
- [ ] No 403 errors for outbound API calls

## Next Steps

1. **Set up Supabase environment variables** (see [Firebase + Supabase Setup Guide](firebase-supabase-setup.md))
2. **Test local production build**: `npm run build && npm run start`
3. **Deploy to Firebase**: `firebase deploy`
4. **Monitor logs**: `firebase functions:log --only nextApp`
5. **Verify integrations**: Test Supabase, Esri, GPT, and Flask APIs

## Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Next.js SSR with Firebase](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [Firebase Blaze Plan Pricing](https://firebase.google.com/pricing)
- [Firebase + Supabase Setup Guide](firebase-supabase-setup.md)

