# Blaze Plan Setup - Verification Checklist

## ✅ Configuration Complete

Your UTILITX project is now configured for Firebase Blaze plan with full SSR support.

## Files Updated

### 1. `functions/src/index.ts` ✅
- SSR-optimized Firebase Function
- Region: `us-central1`
- Structured logging enabled
- TypeScript types properly configured
- Handles all Next.js routes via SSR

### 2. `firebase.json` ✅
- All routes rewritten to `nextApp` function
- Predeploy hook builds Next.js before deployment
- Static assets served from `public` directory

### 3. `next.config.mjs` ✅
- SSR mode enabled (no `output: 'export'`)
- Supports dynamic routes
- Ready for Blaze plan networking

### 4. `functions/package.json` ✅
- Dependencies installed
- TypeScript types configured
- Build script working

## Pre-Deployment Checklist

Before deploying, verify:

- [x] Firebase Blaze plan activated
- [x] `functions/src/index.ts` uses SSR setup with region `us-central1`
- [x] `firebase.json` rewrites all routes to `nextApp`
- [x] `next.config.mjs` does NOT use `output: 'export'`
- [x] Functions directory builds successfully (`cd functions && npm run build`)
- [ ] Environment variables set in Firebase Functions (see below)
- [ ] Next.js app builds successfully (`npm run build`)

## Deployment Steps

### Step 1: Set Environment Variables

```bash
firebase functions:config:set \
  supabase.url="https://your-project.supabase.co" \
  supabase.anon_key="your_anon_key_here"
```

### Step 2: Build and Deploy

```bash
# Build Next.js app
npm run build

# Deploy to Firebase
firebase deploy
```

### Step 3: Verify Deployment

1. **Visit your app URL**: `https://utilitx-pilot.web.app`
2. **Test Supabase file access**: Click "View Record" button
3. **Check Firebase Console → Functions → Logs → nextApp**
4. **Verify structured logging**: Should see request/response logs

## Expected Logs

After deployment, you should see structured logs in Firebase Console:

```
Next.js SSR Request {
  method: "GET",
  url: "/share/123",
  userAgent: "...",
  timestamp: "2024-..."
}

Next.js SSR Response {
  method: "GET",
  url: "/share/123",
  status: 200,
  duration: "45ms",
  timestamp: "2024-..."
}
```

## Troubleshooting

### Functions build fails
- **Fix**: Run `cd functions && npm install && npm run build`

### Deployment fails
- **Fix**: Ensure `npm run build` succeeds in project root first

### Routes return 404
- **Fix**: Verify `firebase.json` rewrites `**` to `nextApp`

### Outbound API calls blocked
- **Fix**: Verify Blaze plan is activated in Firebase Console

## Next Steps

1. Set environment variables in Firebase Functions
2. Deploy: `npm run build && firebase deploy`
3. Verify app loads and Supabase works
4. Monitor logs: `firebase functions:log --only nextApp`
5. Test all integrations: Supabase, Esri, GPT, Flask

## Documentation

- **[Blaze Plan Setup Guide](BLAZE_PLAN_SETUP.md)**: Complete setup guide
- **[Firebase + Supabase Setup](firebase-supabase-setup.md)**: Supabase configuration
- **[Firebase Configuration](../FIREBASE_CONFIG.md)**: Configuration reference

