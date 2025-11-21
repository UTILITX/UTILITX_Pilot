# ArcGIS OAuth Setup Guide

This document explains how to configure and use ArcGIS OAuth authentication in the UTILITX application.

## Overview

The application has been migrated from public API key access to OAuth-secured access. This provides better security and user-specific permissions.

## Environment Variables

Add these to your `.env.local` file:

```bash
# ArcGIS OAuth Configuration
ARCGIS_CLIENT_ID=your_client_id_here
ARCGIS_CLIENT_SECRET=your_client_secret_here
ARCGIS_REDIRECT_URI=http://localhost:3000/api/auth/arcgis/callback

# For production, update the redirect URI:
# ARCGIS_REDIRECT_URI=https://yourdomain.com/api/auth/arcgis/callback

# Optional: App URL (used for redirect URI fallback)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Keep API key as fallback (for development/testing)
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
```

## Setting Up ArcGIS OAuth

1. **Create an Application in ArcGIS Online:**
   - Go to https://www.arcgis.com/home/content.html
   - Click "Add Item" → "Application"
   - Choose "Application" type
   - Fill in the application details
   - Note your **Client ID** and **Client Secret**

2. **Configure Redirect URI:**
   - In your ArcGIS application settings, add the redirect URI:
     - Development: `http://localhost:3000/api/auth/arcgis/callback`
     - Production: `https://yourdomain.com/api/auth/arcgis/callback`

3. **Set Required Scopes:**
   - The application requests the `openid` scope
   - Ensure your ArcGIS application has the necessary permissions for the layers you're accessing

## How It Works

### Authentication Flow

1. User visits `/map` page
2. If not authenticated, user is redirected to `/api/auth/arcgis/login`
3. User is redirected to ArcGIS OAuth authorization page
4. After authorization, ArcGIS redirects to `/api/auth/arcgis/callback`
5. Callback exchanges authorization code for access token
6. Token is stored in HTTP-only cookies
7. User is redirected back to `/map` page

### Token Usage

- **Feature Layers**: All `EL.featureLayer()` calls now use the OAuth token if available, falling back to API key
- **REST API Calls**: All ArcGIS REST API calls (queries, addFeatures) use the OAuth token
- **Basemaps**: Basemap layers use the OAuth token for authentication

### Token Storage

- Tokens are stored in **HTTP-only cookies** (server-side)
- Tokens are also accessible via `/api/auth/arcgis/token` endpoint (client-side)
- Tokens expire after 2 hours (configurable in OAuth settings)
- Refresh tokens are stored for automatic renewal (90-day expiry)

## API Routes

### `/api/auth/arcgis/login`
- Initiates OAuth flow
- Redirects user to ArcGIS authorization page

### `/api/auth/arcgis/callback`
- Handles OAuth callback
- Exchanges code for token
- Stores token in cookies
- Redirects to `/map`

### `/api/auth/arcgis/logout`
- Clears all ArcGIS auth cookies
- Redirects to `/map`

### `/api/auth/arcgis/token`
- Returns current token status
- Used by client-side code to check authentication

## Code Changes

### Components Updated

1. **`components/EsriMap.tsx`**
   - Added `arcgisToken` prop
   - Updated all `EL.featureLayer()` calls to use token
   - Updated basemap layers to use token

2. **`components/map-with-drawing.tsx`**
   - Added `arcgisToken` prop
   - Passes token to `EsriMap` component

3. **`app/map/ClientMapPage.tsx`**
   - Uses `useArcGISAuth()` hook
   - Checks authentication on mount
   - Passes token to map components
   - Passes token to data fetching functions

4. **`lib/esriQuery.ts`**
   - Updated to accept optional token parameter
   - Falls back to API key if no token provided

5. **`lib/esriUtils.ts`**
   - Updated `addFeatureToLayer()` to accept optional token parameter
   - Falls back to API key if no token provided

6. **`lib/fetchAllEsriData.ts`**
   - Updated to accept optional token parameter
   - Passes token to query functions

### New Files

1. **`lib/arcgis-auth.ts`**
   - Token management utilities
   - Cookie-based storage helpers

2. **`contexts/ArcGISAuthContext.tsx`**
   - React context for auth state
   - Provides `useArcGISAuth()` hook

3. **`app/api/auth/arcgis/*`**
   - OAuth login, callback, logout, and token routes

## Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Visit the map page:**
   ```
   http://localhost:3000/map
   ```

3. **You should be redirected to ArcGIS login**

4. **After logging in, you should be redirected back to the map**

5. **Verify layers load correctly:**
   - Work Areas layer should display
   - Records layers should display
   - Basemap should load

## Troubleshooting

### "ARCGIS_CLIENT_ID not configured"
- Check that `ARCGIS_CLIENT_ID` is set in `.env.local`
- Restart the development server after adding environment variables

### "Authentication failed"
- Verify your Client ID and Client Secret are correct
- Check that the redirect URI matches exactly in ArcGIS Online

### "Token exchange failed"
- Verify your Client Secret is correct
- Check that the redirect URI in your code matches ArcGIS Online settings

### Layers not loading
- Check browser console for errors
- Verify the OAuth token is being used (check Network tab)
- Ensure your ArcGIS user has permissions to access the layers

### Fallback to API Key
- If OAuth fails, the system falls back to `NEXT_PUBLIC_ARCGIS_API_KEY`
- This allows development/testing without OAuth
- In production, ensure OAuth is properly configured

## Migration Notes

- **Backward Compatible**: The system falls back to API key if OAuth token is not available
- **No Breaking Changes**: Existing functionality remains the same
- **Gradual Migration**: You can test OAuth while keeping API key as fallback

## Security Considerations

- Tokens are stored in HTTP-only cookies (not accessible via JavaScript)
- Tokens expire after 2 hours
- Refresh tokens allow automatic renewal
- In production, use HTTPS for all requests
- Consider implementing token refresh logic for long sessions

