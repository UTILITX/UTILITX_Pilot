# Firebase Deployment Guide

This guide walks you through deploying the UTILITX Pilot app to Firebase Hosting with proper environment variable configuration.

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created
- Firebase project initialized (`firebase init`)

## Step 1: Set Up Environment Variables

Since this project uses Next.js static export (`output: 'export'`), environment variables must be available **at build time**.

### Option A: Using `.env.production.local` (Recommended for Firebase Hosting)

1. **Create `.env.production.local` in the project root:**

   ```bash
   cp .env.production.local.example .env.production.local
   ```

2. **Fill in your actual values:**

   ```env
   NEXT_PUBLIC_ARCGIS_API_KEY=AAGxxxxx...
   NEXT_PUBLIC_WORKAREA_LAYER_URL=https://services.arcgis.com/.../WorkAreas/FeatureServer/0
   NEXT_PUBLIC_RECORDS_LAYER_URL=https://services.arcgis.com/.../Records/FeatureServer/0
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

3. **Important:** 
   - All variables MUST start with `NEXT_PUBLIC_`
   - No spaces around the `=` sign
   - No quotes needed (unless the value contains spaces)
   - Use LF (Unix) line endings, not CRLF (Windows)

### Option B: Using Firebase Functions Secrets (If using Firebase Functions)

If you're using Firebase Functions, you can use secrets:

```bash
firebase functions:secrets:set NEXT_PUBLIC_ARCGIS_API_KEY
firebase functions:secrets:set NEXT_PUBLIC_WORKAREA_LAYER_URL
firebase functions:secrets:set NEXT_PUBLIC_RECORDS_LAYER_URL
firebase functions:secrets:set NEXT_PUBLIC_SUPABASE_URL
firebase functions:secrets:set NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Step 2: Configure ArcGIS API Key Referrers

In your [ArcGIS Developer Dashboard → API Key → Referrers], add:

```
http://localhost:3000/*
http://localhost:3001/*
https://your-firebase-app.web.app/*
https://your-firebase-app.firebaseapp.com/*
```

This allows both your local dev environment and your deployed Firebase app to use the API key.

## Step 3: Build Locally

Build the production bundle locally to verify everything works:

```bash
npm run build
```

This will:
- Read `.env.production.local` (if it exists)
- Compile the Next.js app
- Export static files to `/out` directory

**Verify the build:**
- Check the console output for any errors
- Look for warnings about missing environment variables
- The `/out` directory should be created with all static files

## Step 4: Test Production Build Locally

Before deploying, test the production build locally:

```bash
npx serve out
```

Or:

```bash
npm run start
```

Then open `http://localhost:3000` and verify:
- ✅ Map renders
- ✅ Basemap loads (if API key is set)
- ✅ Work Areas layer loads (if URL is set)
- ✅ Records layer loads (if URL is set)
- ✅ No console errors

## Step 5: Deploy to Firebase

Once the local build works:

```bash
firebase deploy
```

Or deploy only hosting:

```bash
firebase deploy --only hosting
```

## Step 6: Verify Deployment

After deployment:

1. **Open your Firebase app URL** (e.g., `https://your-app.web.app`)
2. **Open browser console** (F12)
3. **Check for these logs:**
   ```
   🔧 ArcGIS Configuration:
     - API Key: ✅ Set (AAGxxxxx...)
     - Work Area Layer: ✅ Set (https://...)
     - Records Layer: ✅ Set (https://...)
   ```
4. **Verify the map:**
   - Map container renders
   - Basemap tiles load
   - Feature layers appear (if configured)

## Troubleshooting

### Map renders but basemap doesn't load

**Symptoms:**
- Map container is visible but blank/gray
- Console shows: `⚠️ ArcGIS API key is not set`

**Fix:**
1. Verify `.env.production.local` exists and has `NEXT_PUBLIC_ARCGIS_API_KEY`
2. Rebuild: `npm run build`
3. Redeploy: `firebase deploy`

### Map renders but feature layers don't load

**Symptoms:**
- Basemap loads but no work areas or records appear
- Console shows: `❌ Missing Work Area layer URL or API key`

**Fix:**
1. Verify `.env.production.local` has both layer URLs
2. Check that URLs are correct (FeatureServer endpoints)
3. Verify API key has permissions for these layers
4. Rebuild and redeploy

### "Invalid token" or 401 errors

**Symptoms:**
- Console shows: `401 Unauthorized` or `Invalid token`

**Fix:**
1. Check ArcGIS API key referrers include your Firebase domain
2. Verify API key is correct in `.env.production.local`
3. Check API key hasn't expired
4. Rebuild and redeploy

### 403 Forbidden errors

**Symptoms:**
- Console shows: `403 Forbidden` when trying to add features

**Fix:**
1. Verify API key has edit permissions for the layers
2. Check layer settings in ArcGIS Online allow editing
3. Ensure layer URLs are correct

### Environment variables not loading

**Symptoms:**
- Console shows: `❌ Missing required environment variables`
- `hasKey: true` but `keyLength: 0` or undefined

**Fix:**
1. **Check file name:** Must be `.env.production.local` (not `.env.production`)
2. **Check file location:** Must be in project root (same level as `package.json`)
3. **Check variable names:** Must start with `NEXT_PUBLIC_`
4. **Check line endings:** Use LF (Unix), not CRLF (Windows)
5. **Rebuild:** `npm run build` (Next.js only reads env files at build time)
6. **Clear cache:** Delete `.next` and `out` folders, then rebuild

### Build succeeds but variables are still missing

**Check build output:**
```bash
npm run build 2>&1 | grep -i "env\|missing\|undefined"
```

**Verify variables are in the bundle:**
1. Build the app
2. Search the `/out` directory for your API key (first 8 chars):
   ```bash
   grep -r "AAGxxxxx" out/
   ```
3. If not found, the variables weren't included in the build

## Common Issues Checklist

| Issue | Check |
|-------|-------|
| Variables not loading | ✅ File name is `.env.production.local` |
| | ✅ File is in project root |
| | ✅ Variables start with `NEXT_PUBLIC_` |
| | ✅ No spaces around `=` |
| | ✅ Line endings are LF (Unix) |
| | ✅ Rebuilt after changing file |
| Map doesn't render | ✅ Container has height |
| | ✅ No JavaScript errors |
| | ✅ Leaflet CSS loaded |
| Basemap doesn't load | ✅ API key is set |
| | ✅ API key is valid |
| | ✅ Referrers include Firebase domain |
| Layers don't load | ✅ Layer URLs are correct |
| | ✅ API key has permissions |
| | ✅ Layer URLs are FeatureServer endpoints |

## Quick Reference

### File Structure
```
project-root/
├── .env.local              # Local development (not deployed)
├── .env.production.local  # Production build (not in git)
├── package.json
├── next.config.mjs
├── firebase.json
└── out/                    # Built static files (deployed)
```

### Build & Deploy Commands
```bash
# Build production bundle
npm run build

# Test production build locally
npx serve out

# Deploy to Firebase
firebase deploy

# Deploy only hosting
firebase deploy --only hosting
```

### Environment Variable Format
```env
# ✅ Correct
NEXT_PUBLIC_ARCGIS_API_KEY=AAGxxxxx...

# ❌ Wrong - missing prefix
ARCGIS_API_KEY=AAGxxxxx...

# ❌ Wrong - spaces around =
NEXT_PUBLIC_ARCGIS_API_KEY = AAGxxxxx...

# ❌ Wrong - quotes (usually not needed)
NEXT_PUBLIC_ARCGIS_API_KEY="AAGxxxxx..."
```

## Next Steps

After successful deployment:

1. **Monitor console logs** in production for any errors
2. **Test all features** (drawing, uploading, sharing)
3. **Verify layers load** and features can be added
4. **Check performance** - ensure map loads quickly
5. **Update documentation** with your production URLs

## Support

If you continue to have issues:

1. Check browser console for specific error messages
2. Verify `.env.production.local` format matches the example
3. Test the build locally before deploying
4. Check Firebase deployment logs for build errors

