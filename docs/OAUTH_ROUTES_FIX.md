# OAuth Routes Fix - Summary

## Issue
The OAuth routes were created at `/api/auth/arcgis/callback` and `/api/auth/arcgis/login`, but ArcGIS redirects to `/api/auth/callback` (without the `arcgis` part), causing 404 errors.

## Solution
Moved routes to the correct paths and updated all references.

## New Route Structure

### ✅ Correct Routes (Now Active)

```
/app/api/auth/login/route.ts         → /api/auth/login
/app/api/auth/callback/route.ts      → /api/auth/callback
/app/api/auth/check/route.ts         → /api/auth/check
/app/api/auth/logout/route.ts        → /api/auth/logout
```

### ❌ Old Routes (Can be deleted)

```
/app/api/auth/arcgis/login/route.ts     → /api/auth/arcgis/login (not used)
/app/api/auth/arcgis/callback/route.ts  → /api/auth/arcgis/callback (not used)
/app/api/auth/arcgis/token/route.ts     → /api/auth/arcgis/token (replaced by /api/auth/check)
/app/api/auth/arcgis/logout/route.ts    → /api/auth/arcgis/logout (moved to /api/auth/logout)
```

## Updated Files

1. **Created `/app/api/auth/login/route.ts`** - Initiates OAuth flow
2. **Created `/app/api/auth/callback/route.ts`** - Handles OAuth callback
3. **Created `/app/api/auth/check/route.ts`** - Checks authentication status
4. **Created `/app/api/auth/logout/route.ts`** - Clears auth tokens
5. **Updated `contexts/ArcGISAuthContext.tsx`** - Uses `/api/auth/check`
6. **Updated `app/map/ClientMapPage.tsx`** - Uses `/api/auth/login`
7. **Updated `lib/esriQuery.ts`** - Uses `/api/auth/check`
8. **Updated `lib/esriUtils.ts`** - Uses `/api/auth/check`
9. **Updated `components/workflows/upload-tab.tsx`** - Uses `/api/auth/check`

## Environment Variables

Make sure your `.env.local` has:

```bash
ARCGIS_CLIENT_ID=wqvStHHasME6jfo2
ARCGIS_CLIENT_SECRET=225dd4a3f42d4a0d9d32a8834d93bafc
ARCGIS_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

**Important:** 
- NO `NEXT_PUBLIC_` prefix for CLIENT_ID and CLIENT_SECRET
- Redirect URI must match exactly in ArcGIS Online settings

## Flow

1. User visits `/map` → Not authenticated → Redirects to `/api/auth/login`
2. `/api/auth/login` → Redirects to ArcGIS OAuth page
3. User logs in → ArcGIS redirects to `/api/auth/callback?code=...`
4. `/api/auth/callback` → Exchanges code for token → Stores in cookie → Redirects to `/map`
5. Frontend calls `/api/auth/check` → Gets token from cookie → Loads map

## Testing

1. Visit `/map` - should redirect to ArcGIS login
2. Complete login - should redirect back to `/map`
3. Map should load with OAuth token
4. Check browser Network tab - should see `/api/auth/callback` receiving code
5. Check server console - should see token exchange logs

## Next Steps

After confirming everything works, you can delete the old routes in `/app/api/auth/arcgis/`:

```bash
# Optional cleanup (only after confirming new routes work)
rm -rf app/api/auth/arcgis
```

