# OAuth FeatureLayer Edit Fix

## Issue
After switching to OAuth, FeatureLayers can be read but edits fail with:
```
The requested layer (layerId: addFeatures) was not found.
```

## Root Cause
This error is ArcGIS's way of saying "You tried to edit a secured layer without a valid token." Even though the map displays (read works), edit operations require the OAuth token to be passed correctly.

## Solution
The `addFeatureToLayer` function in `lib/esriUtils.ts` already handles OAuth tokens correctly. The issue is ensuring:

1. **Token is passed to `addFeatureToLayer`** - ✅ Already done in `EsriMap.tsx`
2. **Token is valid and has edit permissions** - ⚠️ Check ArcGIS Online
3. **Error messages are clear** - ✅ Enhanced error handling added

## Changes Made

### 1. Enhanced Error Handling (`lib/esriUtils.ts`)
- Added specific handling for "layer not found" errors
- Improved error messages to explain OAuth permission issues
- Added debug logging to show token type being used

### 2. Token Logging
- Added logging to show which authentication method is being used
- Token preview (first 15 chars) for debugging
- Full error details logged for troubleshooting

### 3. FeatureLayer Creation
- WorkAreas layer uses `arcgisToken` when available
- Records layers use `arcgisToken` when available
- All layers fall back to API key if no OAuth token

## Verification Steps

1. **Check token is being used:**
   - Look for log: `📤 Using authentication: OAuth token (provided)` or `OAuth token (fetched)`
   - Should NOT say "API key" if OAuth is active

2. **Check ArcGIS Online permissions:**
   - Go to your layer settings
   - Ensure "Edit" is enabled
   - Ensure your OAuth user has edit permissions

3. **Test edit operation:**
   - Draw a new work area
   - Check console for token usage logs
   - If error occurs, check the detailed error message

## Common Issues

### "Layer not found" Error
**Cause:** OAuth token doesn't have edit permissions

**Fix:**
1. Check ArcGIS Online → Layer Settings → Edit Permissions
2. Ensure your OAuth user account has edit access
3. Verify token is not expired

### Token Not Being Passed
**Cause:** `arcgisToken` prop is null/undefined

**Fix:**
1. Check `useArcGISAuth()` hook returns token
2. Verify token is passed to `EsriMap` component
3. Check `/api/auth/check` returns valid token

### API Key Fallback Being Used
**Cause:** OAuth token not available, falling back to API key

**Fix:**
1. Ensure OAuth flow completes successfully
2. Check token is stored in cookie
3. Verify `/api/auth/check` endpoint works

## Next Steps

If edits still fail after these changes:

1. **Check the console logs** - Look for:
   - `📤 Using authentication: ...` - Should show OAuth token
   - `❌ Full error details:` - Will show exact ArcGIS error

2. **Verify OAuth user permissions:**
   - Log into ArcGIS Online with your OAuth account
   - Check if you can manually edit the layer
   - If not, grant edit permissions to your user

3. **Test with API key temporarily:**
   - If API key works but OAuth doesn't, it's a permissions issue
   - Grant your OAuth user the same permissions as the API key

