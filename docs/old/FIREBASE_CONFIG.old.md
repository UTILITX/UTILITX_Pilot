# Firebase Configuration - UTILITX

## Blaze Plan Required

This configuration **requires Firebase Blaze plan** for:
- ✅ Outbound API calls from Functions (Supabase, Esri, GPT, Flask)
- ✅ Server-side rendering (SSR) with Next.js
- ✅ Dynamic routes (/share/[id], /contribute/[id], etc.)
- ✅ Unlimited HTTPS Functions

## Configuration Files

### `firebase.json`
- All routes are rewritten to `nextApp` function
- SSR is handled by Firebase Functions
- Static assets are served from `public` directory

### `next.config.mjs`
- **DO NOT use `output: 'export'`** - breaks SSR and dynamic routes
- SSR mode is required for Firebase Functions
- Supports dynamic routes and API routes

### `functions/src/index.ts`
- Region: `us-central1` (optimal performance)
- Structured logging enabled for debugging
- Handles all Next.js routes via SSR

## Deployment

```bash
# Build Next.js app
npm run build

# Deploy to Firebase
firebase deploy
```

## Verification

1. Visit your hosted app URL
2. Test Supabase file access (View Record button)
3. Check Firebase Console → Functions → Logs → nextApp
4. Verify outbound API calls are working (no 403 errors)

## Troubleshooting

### Outbound API calls blocked
- **Cause**: Spark plan doesn't allow outbound API calls
- **Fix**: Upgrade to Blaze plan

### Static export errors
- **Cause**: `output: 'export'` in next.config.mjs
- **Fix**: Remove `output: 'export'` - SSR is required

### Routes not working
- **Cause**: firebase.json not rewriting to nextApp function
- **Fix**: Ensure `rewrites` section routes `**` to `nextApp`

