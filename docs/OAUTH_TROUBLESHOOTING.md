# OAuth Troubleshooting Guide

## Common Issues and Solutions

### 401 Unauthorized Error

If you're getting a 401 error during token exchange, check the following:

#### 1. Environment Variables Not Loading

**Symptom:** Console shows `undefined` for CLIENT_ID or SECRET

**Solution:**
- Ensure variables are in `.env.local` (not `.env`)
- Variables must NOT have `NEXT_PUBLIC_` prefix:
  ```bash
  # ✅ CORRECT
  ARCGIS_CLIENT_ID=your_client_id
  ARCGIS_CLIENT_SECRET=your_client_secret
  
  # ❌ WRONG
  NEXT_PUBLIC_ARCGIS_CLIENT_ID=your_client_id
  ```
- Restart your dev server after adding/changing env vars
- In production, ensure env vars are set in your hosting platform

#### 2. Redirect URI Mismatch

**Symptom:** Token exchange fails with "redirect_uri_mismatch" error

**Solution:**
- The redirect URI in your code must EXACTLY match ArcGIS Online settings
- Check for:
  - `http` vs `https`
  - Trailing slashes
  - Case sensitivity
  - Port numbers (localhost:3000 vs localhost:3001)

**In ArcGIS Online:**
- Go to your application settings
- Add redirect URI: `http://localhost:3000/api/auth/arcgis/callback`
- For production: `https://yourdomain.com/api/auth/arcgis/callback`

#### 3. Invalid Client Credentials

**Symptom:** 401 error with "invalid_client" or "invalid_grant"

**Solution:**
- Verify Client ID is correct (copy from ArcGIS Online)
- Verify Client Secret is correct (regenerate if needed)
- Ensure no extra spaces or quotes in `.env.local`:
  ```bash
  # ✅ CORRECT
  ARCGIS_CLIENT_ID=abc123def456
  
  # ❌ WRONG (has quotes)
  ARCGIS_CLIENT_ID="abc123def456"
  
  # ❌ WRONG (has spaces)
  ARCGIS_CLIENT_ID = abc123def456
  ```

#### 4. Code Already Used

**Symptom:** "invalid_grant" error

**Solution:**
- Authorization codes can only be used once
- If you refresh the callback page, you'll get this error
- Solution: Start a fresh OAuth flow (go to `/api/auth/arcgis/login`)

## Debug Checklist

When debugging OAuth issues, check the server console for:

1. **CLIENT_ID present?**
   ```
   🔍 DEBUG CLIENT_ID: abc123def4...
   ```
   If shows `undefined` → env var not loading

2. **CLIENT_SECRET present?**
   ```
   🔍 DEBUG SECRET: present
   ```
   If shows `missing` → env var not loading

3. **Redirect URI matches?**
   ```
   🔍 DEBUG REDIRECT_URI: http://localhost:3000/api/auth/arcgis/callback
   ```
   Must match exactly what's in ArcGIS Online

4. **Code received?**
   ```
   🔍 DEBUG CODE: present
   ```
   If missing → OAuth flow didn't complete

5. **Token response details:**
   ```
   ✅ TOKEN RESPONSE: { hasAccessToken: true, ... }
   ```
   If `hasAccessToken: false` → token exchange failed

## Testing Steps

1. **Check environment variables:**
   ```bash
   # In your terminal
   node -e "console.log(process.env.ARCGIS_CLIENT_ID)"
   ```
   Should show your client ID (not `undefined`)

2. **Check redirect URI in code:**
   - Look at server console when visiting `/api/auth/arcgis/login`
   - Verify the redirect URI matches ArcGIS Online

3. **Test OAuth flow:**
   - Visit `/api/auth/arcgis/login`
   - Complete login on ArcGIS
   - Check server console for debug logs
   - Check browser Network tab for callback response

4. **Verify token storage:**
   - After successful callback, check cookies
   - Should see `arcgis_token` cookie set
   - Visit `/api/auth/arcgis/token` to verify

## Common Error Messages

### "ARCGIS_CLIENT_ID not configured"
- Env var not set or not loading
- Check `.env.local` exists and has correct variable name

### "redirect_uri_mismatch"
- Redirect URI in code doesn't match ArcGIS Online
- Check both locations and ensure exact match

### "invalid_client"
- Client ID or Secret is wrong
- Regenerate credentials in ArcGIS Online if needed

### "invalid_grant"
- Authorization code already used or expired
- Start fresh OAuth flow

### "unauthorized_client"
- Client ID doesn't have permission for this redirect URI
- Add redirect URI in ArcGIS Online application settings

## Production Checklist

Before deploying to production:

- [ ] Set `ARCGIS_CLIENT_ID` in hosting platform
- [ ] Set `ARCGIS_CLIENT_SECRET` in hosting platform
- [ ] Set `ARCGIS_REDIRECT_URI` to production URL
- [ ] Add production redirect URI in ArcGIS Online
- [ ] Test OAuth flow in production environment
- [ ] Verify HTTPS is enabled (required for secure cookies)

