# UTILITX Pilot Map App

## Environment Variables

Next.js reads `.env.local` on `npm run dev`, `npm run build`, and `npm run start`. Restart the server after editing env variables.

## Build Configuration

**IMPORTANT:** UTILITX requires SSR (Server-Side Rendering) for Firebase Functions. The app uses dynamic routes (`/share/[id]`, `/contribute/[id]`, etc.) and server-side rendering, so `output: 'export'` is NOT used. This ensures `npm run start` works correctly and all routes are properly handled by Firebase Functions.

## Local Testing

To test the production build locally:

```bash
npm run build
npm run start
```

This will start the Next.js production server at `http://localhost:3000`. This matches the behavior you'll get on Firebase Functions.

## Firebase Deployment

The project is configured for **Firebase Hosting + Functions** deployment with **Blaze plan** support. The Firebase Function (`nextApp`) handles all routes for server-side rendering.

### Blaze Plan Requirements

**UTILITX requires Firebase Blaze plan** for:
- ✅ Outbound API calls (Supabase, Esri, GPT, Flask)
- ✅ Server-side rendering (SSR)
- ✅ Dynamic routes (/share/[id], /contribute/[id], etc.)
- ✅ Unlimited HTTPS Functions

### Deployment Steps

1. **Build Next.js app**:
   ```bash
   npm run build
   ```

2. **Set Supabase environment variables** (if not already set):
   ```bash
   firebase functions:config:set \
     supabase.url="https://your-project.supabase.co" \
     supabase.anon_key="your_anon_key_here"
   ```

3. **Deploy to Firebase**:
   ```bash
   firebase deploy
   ```

4. **Verify deployment**:
   - Visit your app URL: `https://utilitx-pilot.web.app`
   - Test Supabase file access (View Record button)
   - Check Firebase Console → Functions → Logs → nextApp

### Documentation

- **[Deployment Guide](docs/DEPLOYMENT.md)**: Complete deployment guide for Firebase SSR
- **[Firebase + Supabase Setup](docs/firebase-supabase-setup.md)**: Supabase configuration for Firebase Functions
- **[Logger Setup](docs/LOGGER_SETUP.md)**: Structured logging guide

## Troubleshooting

### Supabase file access works locally but fails in production

This is a common issue with Firebase Functions deployment. The Supabase client factory (`lib/supabase-client.ts`) automatically handles environment variable resolution in all environments, but you must configure Firebase Functions environment variables for production.

**Solution:** See [Firebase + Supabase Setup Guide](docs/firebase-supabase-setup.md) for step-by-step instructions.

### Outbound API calls blocked (403 errors)

**Cause:** Spark plan doesn't allow outbound API calls.

**Fix:** Upgrade to Blaze plan in Firebase Console.

### Static export errors

**Cause:** `output: 'export'` in `next.config.mjs` breaks SSR.


**Fix:** Remove `output: 'export'` - SSR is required for Firebase Functions. See [Blaze Plan Setup Guide](docs/BLAZE_PLAN_SETUP.md) for details.

Testing, testing

