# UTILITX Deployment Guide

## Overview

UTILITX is deployed to **Firebase Hosting + Functions** using **SSR (Server-Side Rendering)** on the **Firebase Blaze plan**. This enables:
- ✅ Dynamic routes (`/share/[id]`, `/contribute/[id]`, etc.)
- ✅ Server-side rendering
- ✅ Outbound API calls (Supabase, Esri, GPT, Flask)
- ✅ Next.js API routes
- ✅ Unlimited HTTPS Functions

### Blaze Plan Requirements

**UTILITX requires Firebase Blaze plan** for:
- Outbound API calls from Functions (Supabase, Esri, GPT, Flask)
- Full SSR (Server-Side Rendering) support
- Dynamic routes
- Unlimited HTTPS Functions

If you're on the Spark plan, upgrade to Blaze in Firebase Console.

## Prerequisites

- [x] Firebase Blaze plan activated
- [x] Firebase CLI installed (`npm install -g firebase-tools`)
- [x] Firebase project initialized
- [x] Node.js 20+ installed

## Quick Start

### 1. Set Environment Variables

```bash
firebase functions:config:set \
  supabase.url="https://your-project.supabase.co" \
  supabase.anon_key="your_anon_key_here"
```

### 2. Deploy

```bash
npm run build
firebase deploy
```

That's it! The predeploy hooks automatically:
1. Build Next.js
2. Copy build files to functions directory
3. Deploy to Firebase

## Deployment Process

### Automated Steps (via predeploy hooks)

When you run `firebase deploy`, the following happens automatically:

1. **Build Next.js**: `npm run build` (creates `.next` directory)
2. **Copy Build Files**: `copy-next-build.js` copies `.next` to `functions/.next`
3. **Deploy Functions**: Firebase packages and deploys `functions` directory
4. **Deploy Hosting**: Firebase deploys hosting configuration

### Manual Deployment

```bash
# 1. Build Next.js
npm run build

# 2. Deploy to Firebase
firebase deploy
```

## Configuration Files

### `firebase.json`

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR/..\" run build",
      "node \"$RESOURCE_DIR/copy-next-build.js\""
    ]
  },
  "hosting": {
    "rewrites": [
      { "source": "**", "function": "nextApp" }
    ]
  }
}
```

### `next.config.mjs`

**IMPORTANT**: Must NOT use `output: 'export'`
- SSR mode is required
- Supports dynamic routes
- Enables API routes

### `functions/src/index.ts`

- Region: `us-central1`
- Runtime: Node 20
- Structured logging enabled

## Environment Variables

### Local Development

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_ARCGIS_API_KEY=your_arcgis_key_here
```

### Firebase Functions (Production)

Set via Firebase CLI:
```bash
firebase functions:config:set \
  supabase.url="https://your-project.supabase.co" \
  supabase.anon_key="your_anon_key_here"
```

Or via Firebase Console:
1. Go to Firebase Console → Functions → Configuration
2. Add environment variables

## Verification

### After Deployment

1. **Visit your app URL**: `https://utilitx-pilot.web.app`
2. **Test Supabase file access**: Click "View Record" button
3. **Check Firebase Console → Functions → Logs → nextApp**
4. **Verify structured logging**: Should see request/response logs

### View Logs

```bash
# View real-time logs
firebase functions:log --only nextApp

# Or in Firebase Console
# Firebase Console → Functions → Logs → nextApp
```

## Troubleshooting

### "Could not find production build" error

**Cause**: `.next` directory not copied to `functions/.next`

**Fix**:
```bash
# Manually copy build files
node functions/copy-next-build.js

# Then deploy
firebase deploy
```

### Outbound API calls blocked (403 errors)

**Symptoms**: 403 errors when calling Supabase, Esri, GPT, or Flask APIs

**Cause**: Spark plan doesn't allow outbound API calls

**Fix**: Upgrade to Blaze plan in Firebase Console

### Static export errors

**Cause**: `output: 'export'` in `next.config.mjs`

**Fix**: Remove `output: 'export'` - SSR is required

### Function fails to start

**Cause**: `.next` directory path incorrect or missing

**Fix**: 
1. Verify `functions/src/index.ts` checks both locations:
   - `functions/.next` (deployed)
   - `../.next` (local)
2. Ensure predeploy hook runs: `node functions/copy-next-build.js`
3. Check that `.next` directory exists after build

### Routes not working (404 errors)

**Cause**: `firebase.json` not rewriting to `nextApp` function

**Fix**: Ensure `rewrites` section routes `**` to `nextApp`:
```json
{
  "rewrites": [
    { "source": "**", "function": "nextApp" }
  ]
}
```

## Related Documentation

- **[Firebase + Supabase Setup](firebase-supabase-setup.md)**: Supabase configuration for Firebase Functions
- **[Logger Setup](LOGGER_SETUP.md)**: Structured logging guide
- **[End-to-End Flow](end_to_end_flow)**: Application workflow overview

## Deployment Checklist

- [ ] Firebase Blaze plan activated
- [ ] Environment variables set in Firebase Functions
- [ ] `npm run build` succeeds
- [ ] `firebase deploy` succeeds
- [ ] App loads at hosted URL
- [ ] Supabase file access works
- [ ] Firebase Functions logs show successful requests
- [ ] No 403 errors for outbound API calls

## Support

For issues or questions:
1. Check Firebase Console → Functions → Logs
2. Review [Troubleshooting](#troubleshooting) section
3. Verify environment variables are set correctly
4. Ensure Blaze plan is activated

