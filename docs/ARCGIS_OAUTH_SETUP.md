# ArcGIS OAuth Setup & Authentication Guide

**⚠️ IMPORTANT: This document describes the complete ArcGIS OAuth setup, the authentication issues encountered, and the definitive solution that bypasses IdentityManager's token interception.**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [ArcGIS Portal & OAuth App Setup](#arcgis-portal--oauth-app-setup)
4. [Next.js Application Configuration](#nextjs-application-configuration)
5. [The Authentication Problem](#the-authentication-problem)
6. [The Solution: Direct REST API Calls](#the-solution-direct-rest-api-calls)
7. [How It Works](#how-it-works)
8. [File Structure](#file-structure)
9. [Testing & Verification](#testing--verification)
10. [Troubleshooting](#troubleshooting)
11. [Production Checklist](#production-checklist)

---

## Overview

This application uses ArcGIS OAuth 2.0 for authentication with ArcGIS Online/Enterprise. Users authenticate through their ArcGIS organization portal, and the application uses OAuth tokens to save features to ArcGIS Feature Layers.

**Key Components:**
- **OAuth Flow**: Authorization Code flow with server-side token exchange
- **Token Storage**: HttpOnly cookies (server-side) for security
- **Feature Saving**: Direct REST API calls to bypass IdentityManager token interception
- **Layers Supported**: Work Areas and Records (Point, Line, Polygon)

---

## Prerequisites

Before setting up OAuth, ensure you have:

1. **ArcGIS Organization Account** with admin privileges
2. **ArcGIS OAuth Application** registered in your organization
3. **ArcGIS Feature Layers** created and configured:
   - Work Areas layer (Polygon)
   - Records Point layer
   - Records Line layer
   - Records Polygon layer
4. **HTTPS** enabled for local development (required for OAuth)
5. **Next.js 14+** application

---

## ArcGIS Portal & OAuth App Setup

### Step 1: Create OAuth Application in ArcGIS Portal

1. Log in to your ArcGIS Organization Portal (e.g., `https://yourorg.maps.arcgis.com`)
2. Navigate to **Organization** → **Settings** → **Security** → **Applications**
3. Click **"Register an Application"** or **"Add"**
4. Fill in the application details:
   - **Application Title**: UTILITX Pilot (or your app name)
   - **Application Type**: Select **"Native"** or **"Web"**
   - **Redirect URIs**: Add your callback URLs:
     - Local development: `https://localhost:3000/api/auth/callback`
     - Production: `https://your-domain.com/api/auth/callback`
   - **OAuth 2.0 Scopes**: Select:
     - ✅ `user:username` (to get user identity)
     - ✅ Services: Features (for editing features)
5. Click **"Register"**
6. **Copy the Client ID** (you'll need this for `.env.local`)
7. **Copy the Client Secret** (keep this secure - only for server-side use)

### Step 2: Configure Feature Layer Permissions

**⚠️ CRITICAL:** For OAuth to work, the following must be configured:

1. **Share Layers with Organization:**
   - Open each Feature Layer in ArcGIS Online
   - Click **"Share"** → Select **"Organization"**
   - Save changes

2. **Ensure OAuth App Has Access:**
   - Go to **Organization** → **Settings** → **Security** → **Applications**
   - Find your OAuth app → Click **"Edit"**
   - Verify **"Share with Organization"** is enabled

3. **Verify User Permissions:**
   - Users must have **Edit** permissions on the Feature Layers
   - Layer owners or organization admins can grant edit permissions

### Step 3: Get Feature Layer URLs

For each Feature Layer you'll be editing:

1. Open the Feature Layer in ArcGIS Online
2. Click **"View Item Details"**
3. Scroll to **"Service URL"** or **"REST URL"**
4. Copy the URL (e.g., `https://services7.arcgis.com/.../FeatureServer/0`)
5. Store these in your `.env.local` file

---

## Next.js Application Configuration

### Step 1: Environment Variables

Create or update `.env.local` in your project root:

```bash
# ArcGIS OAuth Configuration
NEXT_PUBLIC_ARCGIS_PORTAL_URL=https://yourorg.maps.arcgis.com
NEXT_PUBLIC_ARCGIS_CLIENT_ID=wqvStHHasME6jfo2

# Server-side only (never exposed to client)
ARCGIS_CLIENT_SECRET=225dd4a3f42d4a0d9d32a8834d93bafc

# ArcGIS Feature Layer URLs
NEXT_PUBLIC_ARCGIS_WORK_AREAS_URL=https://services7.arcgis.com/.../WORKAREA/FeatureServer/0
NEXT_PUBLIC_ARCGIS_WORK_AREAS_SERVER_URL=https://services7.arcgis.com/.../arcgis/rest

# Records Layers (optional - these can also be hardcoded in lib/esriLayers.ts)
NEXT_PUBLIC_RECORDS_POINT_LAYER_URL=https://services7.arcgis.com/.../RECORDS_Point/FeatureServer/0
NEXT_PUBLIC_RECORDS_LINE_LAYER_URL=https://services7.arcgis.com/.../Records_Line/FeatureServer/0
NEXT_PUBLIC_RECORDS_POLYGON_LAYER_URL=https://services7.arcgis.com/.../Records_Polygon/FeatureServer/0
```

**Security Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the client (safe for Client IDs and URLs)
- `ARCGIS_CLIENT_SECRET` must **never** have `NEXT_PUBLIC_` prefix (server-side only)
- Add `.env.local` to `.gitignore` to prevent committing secrets

### Step 2: HTTPS for Local Development

ArcGIS OAuth requires HTTPS, even for localhost. Enable it in Next.js:

1. **Option A: Next.js Built-in HTTPS (Recommended)**

   Add to `package.json`:
   ```json
   {
     "scripts": {
       "dev:https": "next dev --experimental-https"
     }
   }
   ```

   Run: `npm run dev:https`

2. **Option B: Custom Certificates**

   See `HTTPS_SETUP.md` for detailed instructions on generating and using custom certificates.

### Step 3: Verify API Routes

Ensure these API routes exist and are properly configured:

- `app/api/auth/login/route.ts` - Redirects to ArcGIS OAuth
- `app/api/auth/callback/route.ts` - Handles OAuth callback
- `app/api/auth/check/route.ts` - Checks authentication status
- `app/api/auth/logout/route.ts` - Clears authentication

---

## The Authentication Problem

### What We Encountered

After setting up OAuth and successfully logging in, we encountered a persistent **"Invalid token" (HTTP 498)** error when saving features to ArcGIS Feature Layers.

**Symptoms:**
- ✅ Login successful (token received and stored in cookies)
- ✅ Token validation passed (verified via `/api/auth/check`)
- ❌ Saving features failed with "Invalid token" error
- 🔍 Console logs showed different token being used than the one fetched from API

**Root Cause:**

The ArcGIS JavaScript API's `IdentityManager` was intercepting all requests made by `FeatureLayer` and automatically replacing the OAuth token we explicitly provided with a **cached token** from previous sessions or IdentityManager's internal credential store.

**Why This Happened:**
1. `IdentityManager.registerOAuthInfos()` was called during app initialization (in `lib/arcgis/setupIdentity.ts`)
2. IdentityManager cached credentials in `localStorage`/`sessionStorage`
3. When `FeatureLayer.applyEdits()` was called, IdentityManager intercepted the request
4. IdentityManager replaced our fresh OAuth token with the cached token
5. The cached token was expired or invalid, causing "Invalid token" errors

**Evidence:**
- Token fetched from API: `3NKHt6i2urmWtqOuugvr...` (correct, fresh token)
- Token used in request: `AAPTxy8BH1VEsoebNVZXo8HurMlhDls4yKVZY4NQpvk2...` (old, cached token)
- Multiple attempts to clear credentials failed because IdentityManager re-cached them

---

## The Solution: Direct REST API Calls

### Approach

Instead of using `FeatureLayer.applyEdits()` (which goes through IdentityManager), we bypass IdentityManager entirely by calling the ArcGIS REST API directly using `fetch()`.

### Implementation Pattern

All save functions now follow this pattern:

1. **Fetch Token from API** (not from IdentityManager)
2. **Prepare Geometry** in ArcGIS JSON format
3. **Make Direct REST API Call** using `fetch()` to `/applyEdits` endpoint
4. **Handle Response** and return results

### Example: `saveWorkArea.ts`

```typescript
// 1. Get token from API (not IdentityManager)
const response = await fetch("/api/auth/check");
const data = await response.json();
const token = data.token;

// 2. Prepare geometry
const geometryForAPI = geometry.toJSON(); // ArcGIS JSON format

// 3. Make direct REST API call
const applyEditsUrl = `${WORK_AREAS_LAYER_URL}/applyEdits`;
const formData = new FormData();
formData.append("f", "json");
formData.append("token", token); // Explicitly use our token
formData.append("adds", JSON.stringify([{
  geometry: geometryForAPI,
  attributes: attributes,
}]));

const response = await fetch(applyEditsUrl, {
  method: "POST",
  body: formData,
});

const result = await response.json();

// 4. Handle response
if (result.error) {
  throw new Error(`ArcGIS applyEdits failed: ${result.error.message}`);
}

return result.addResults?.[0];
```

### Files Using This Pattern

All save functions have been updated to use direct REST API calls:

- ✅ `lib/arcgis/saveWorkArea.ts` - Saves work area polygons
- ✅ `lib/esri/saveRecordPoint.ts` - Saves point records
- ✅ `lib/esri/saveRecordLine.ts` - Saves line/polyline records
- ✅ `lib/esri/saveRecordPolygon.ts` - Saves polygon records

---

## How It Works

### Authentication Flow

```
1. User clicks "Login"
   ↓
2. Redirect to /api/auth/login
   ↓
3. Redirect to ArcGIS OAuth page
   ↓
4. User authorizes application
   ↓
5. ArcGIS redirects to /api/auth/callback?code=...
   ↓
6. Server exchanges code for token
   ↓
7. Server stores token in httpOnly cookie
   ↓
8. Redirect to /map
```

### Feature Saving Flow

```
1. User draws feature on map
   ↓
2. App calls save function (e.g., saveWorkArea)
   ↓
3. Save function fetches token from /api/auth/check
   ↓
4. Prepare geometry in ArcGIS JSON format
   ↓
5. Make direct fetch() call to ArcGIS REST API /applyEdits
   ↓
6. ArcGIS validates token and saves feature
   ↓
7. Return success/error response
```

### Why Direct REST API Works

1. **No IdentityManager Interference**: `fetch()` bypasses IdentityManager entirely
2. **Explicit Token Control**: We control exactly which token is sent
3. **No Credential Caching**: Browser doesn't cache credentials for fetch() calls
4. **Simpler Flow**: Direct HTTP request, no middleware layers

---

## File Structure

### OAuth Routes

```
app/api/auth/
├── login/route.ts          # Initiates OAuth flow
├── callback/route.ts       # Handles OAuth callback
├── check/route.ts          # Checks auth status
└── logout/route.ts         # Clears authentication
```

### Save Functions

```
lib/
├── arcgis/
│   └── saveWorkArea.ts     # Saves work area polygons (direct REST API)
└── esri/
    ├── saveRecordPoint.ts  # Saves point records (direct REST API)
    ├── saveRecordLine.ts   # Saves line records (direct REST API)
    └── saveRecordPolygon.ts # Saves polygon records (direct REST API)
```

### Configuration

```
lib/arcgis/
├── config.ts               # ArcGIS configuration constants
└── setupIdentity.ts        # IdentityManager setup (for other ArcGIS operations)
```

### Context

```
contexts/
└── ArcGISAuthContext.tsx   # React context for auth state
```

---

## Testing & Verification

### 1. Test Login Flow

1. Navigate to `/map`
2. Click "Login" button
3. Should redirect to ArcGIS OAuth page
4. After authorization, should redirect back to `/map`
5. Check browser console for: `🔐 User is authenticated`

### 2. Test Token Storage

1. Open browser DevTools → Application → Cookies
2. Verify `arcgis_token` cookie exists (httpOnly)
3. Verify `arcgis_token_expiry` cookie exists
4. Verify `arcgis_username` cookie exists

### 3. Test Work Area Saving

1. Draw a polygon on the map (work area mode)
2. Complete the drawing
3. Check console for:
   - ✅ `Got OAuth token from API`
   - ✅ `Making direct REST API call to: ...`
   - ✅ `Direct REST API response: {success: true, ...}`
   - ✅ `Work area saved to ArcGIS`
4. Verify polygon appears on map
5. Verify polygon persists after page refresh

### 4. Test Record Saving

**Point Record:**
1. Upload a file or start point drawing
2. Click on map to place point
3. Verify console shows successful save
4. Verify point appears on map

**Line Record:**
1. Upload a file or start line drawing
2. Draw a line on map
3. Verify console shows successful save
4. Verify line appears on map

**Polygon Record:**
1. Upload a file or start polygon drawing
2. Draw a polygon on map
3. Verify console shows successful save
4. Verify polygon appears on map

### 5. Test Logout

1. Click "Logout" button
2. Verify cookies are cleared
3. Verify redirect to `/map` (unauthenticated state)
4. Verify "Login" button appears

---

## Troubleshooting

### Issue: "Invalid redirect_uri" Error

**Symptom:** OAuth login fails with "Invalid redirect_uri"

**Solution:**
1. Verify redirect URI in ArcGIS OAuth app settings **exactly matches** the one in `app/api/auth/login/route.ts`
2. For local development: Must be `https://localhost:3000/api/auth/callback` (not `http://`)
3. Check that redirect URI is added in ArcGIS Portal → Application settings

### Issue: "Invalid token" (HTTP 498) Error

**Symptom:** Token validation passes but saving features fails

**Possible Causes:**
1. **OAuth app not shared with organization** - Check ArcGIS Portal → Applications → Share settings
2. **Layer not shared with organization** - Check Feature Layer → Share → Organization
3. **User doesn't have edit permissions** - Check Feature Layer → Share → Permissions
4. **IdentityManager intercepting** - Verify you're using direct REST API calls (check console logs)

**Solution:**
1. Ensure OAuth app is shared with organization
2. Ensure all Feature Layers are shared with organization
3. Verify user has edit permissions
4. If using old save functions, update them to use direct REST API calls

### Issue: Token Mismatch in Console Logs

**Symptom:** Token in logs doesn't match token used in request

**Solution:**
- This is the IdentityManager interception issue
- Verify you're using the direct REST API approach (see "The Solution" section)
- Check that `FeatureLayer.applyEdits()` is not being called

### Issue: HTTPS Certificate Errors

**Symptom:** Browser shows "Not Secure" or certificate errors for localhost

**Solution:**
1. For Next.js built-in HTTPS: Accept the self-signed certificate in browser
2. For custom certificates: See `HTTPS_SETUP.md`
3. Alternative: Use a tool like `mkcert` to create locally-trusted certificates

### Issue: CORS Errors

**Symptom:** Browser console shows CORS errors when calling ArcGIS API

**Solution:**
- ArcGIS REST API endpoints typically allow CORS from any origin
- If CORS errors occur, check:
  1. Request is going to correct endpoint
  2. Request includes proper headers
  3. Token is included in FormData (not headers)

---

## Production Checklist

Before deploying to production:

- [ ] **OAuth App Configuration**
  - [ ] OAuth app created in ArcGIS Portal
  - [ ] Production redirect URI added to OAuth app
  - [ ] OAuth app shared with organization
  - [ ] Client ID and Secret stored securely (environment variables)

- [ ] **Feature Layers**
  - [ ] All Feature Layers created and configured
  - [ ] All layers shared with organization
  - [ ] Layer URLs stored in environment variables
  - [ ] Layer permissions verified (users can edit)

- [ ] **Environment Variables**
  - [ ] `NEXT_PUBLIC_ARCGIS_PORTAL_URL` set to production portal
  - [ ] `NEXT_PUBLIC_ARCGIS_CLIENT_ID` set
  - [ ] `ARCGIS_CLIENT_SECRET` set (server-side only)
  - [ ] All Feature Layer URLs configured
  - [ ] Environment variables not committed to git

- [ ] **Code Implementation**
  - [ ] All save functions use direct REST API calls
  - [ ] No `FeatureLayer.applyEdits()` calls in save functions
  - [ ] Error handling implemented
  - [ ] Logging appropriate for production

- [ ] **Security**
  - [ ] Client Secret never exposed to client
  - [ ] HttpOnly cookies used for token storage
  - [ ] HTTPS enabled in production
  - [ ] CORS configured correctly

- [ ] **Testing**
  - [ ] Login flow tested in production environment
  - [ ] Work area saving tested
  - [ ] All record types (Point, Line, Polygon) saving tested
  - [ ] Logout tested
  - [ ] Error scenarios tested

---

## Additional Resources

- [ArcGIS OAuth Documentation](https://developers.arcgis.com/documentation/core-concepts/security-and-authentication/)
- [ArcGIS REST API Documentation](https://developers.arcgis.com/rest/services-reference/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [ArcGIS JavaScript API IdentityManager](https://developers.arcgis.com/javascript/latest/api-reference/esri-identity-IdentityManager.html) (for understanding the issue)

---

## Summary

The key insight that solved the authentication issues was:

> **IdentityManager's automatic credential management conflicts with server-side OAuth tokens. By bypassing IdentityManager and calling the ArcGIS REST API directly, we maintain full control over which token is used.**

This approach:
- ✅ Works reliably with server-side OAuth tokens
- ✅ Avoids credential caching issues
- ✅ Simplifies the authentication flow
- ✅ Provides better error handling and debugging
- ✅ Is production-ready

---

**Last Updated:** January 2025  
**Maintained By:** UTILITX Development Team




