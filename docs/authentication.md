# ✅ **UTILITX AUTHENTICATION SPECIFICATION**

**ArcGIS OAuth 2.0 with PKCE (Production Implementation)**

> **This is the only OAuth method UTILITX uses.**  
> It replaces all server-side OAuth, cookies, Firebase Function redirects, and legacy authentication patterns.

---

## 🚀 **1. Overview**

UTILITX uses **ArcGIS OAuth 2.0 with PKCE (Proof Key for Code Exchange)** in a **fully stateless SPA configuration**:

- ✅ **No client secret**
- ✅ **No server callback**
- ✅ **No cookies**
- ✅ **No Next.js API routes**
- ✅ **No Firebase Functions involvement**
- ✅ **No session storage outside the browser**
- ✅ **No SSR dependency**

This is the **recommended, secure, modern architecture** for all browser-based applications authenticated with ArcGIS.

---

## 🧱 **2. Why PKCE (and why stateless)**

PKCE is the OAuth flow designed *specifically* for:

- SPAs (React, Next.js client components)
- Public clients (no secret)
- Browser-only authentication

**Benefits:**
- Zero secret exposure
- No backend round-trip required
- No cookies → no redirect loops
- No SSR → no Firebase Hosting quirks
- No origin mismatch issues
- Works identically in dev & prod

---

## 🎯 **3. Architecture Diagram**

```
Browser SPA ⟶ ArcGIS OAuth (PKCE)  
           ⟵ Redirect with "code"  
Browser SPA ⟶ Token Exchange  
           ⟶ Store token in sessionStorage  
           ⟶ Use token in all ArcGIS requests
```

**No server participates.**

---

## 🛠 **4. Key Components**

### 4.1 **PKCE Utilities** (`/lib/auth/arcgis-pkce.ts`)

Handles:
- Generate code_verifier
- Generate challenge
- Build authorize URL
- Exchange code for tokens

### 4.2 **Redirect Handler Page** (`/app/auth/arcgis/page.tsx`)

This runs **client-side only**:

1. Reads `?code=` from URL
2. Fetches tokens from ArcGIS
3. Saves them in `sessionStorage`
4. Redirects user to `/dashboard`

### 4.3 **React Auth Context** (`/contexts/ArcGISAuthContext.tsx`)

Provides:
- `login()` → starts PKCE redirect
- `logout()` → clears sessionStorage
- `accessToken`
- `isAuthenticated`
- Token auto-loading

### 4.4 **Token Injection** (`/lib/auth/get-token.ts`)

Every call to ArcGIS Feature Layers includes:
```
?token=<ACCESS_TOKEN>
```

Never cookies, never headers.

---

## 🌐 **5. Redirect URIs**

**Inside ArcGIS → App Registration → OAuth 2.0:**

### Development
```
http://localhost:3000/auth/arcgis
```

### Production
```
https://utilitx-pilot-a01bb.web.app/auth/arcgis
```

These **MUST** match exactly.

---

## 🔐 **6. Environment Variables**

**`.env.local`**
```bash
NEXT_PUBLIC_ARCGIS_CLIENT_ID=X59peolTbh7J43eY
NEXT_PUBLIC_ARCGIS_PORTAL_URL=https://indib78f3690c643.maps.arcgis.com
NEXT_PUBLIC_ARCGIS_REDIRECT_URI=http://localhost:3000/auth/arcgis
```

**`.env.production`**
```bash
NEXT_PUBLIC_ARCGIS_CLIENT_ID=X59peolTbh7J43eY
NEXT_PUBLIC_ARCGIS_PORTAL_URL=https://indib78f3690c643.maps.arcgis.com
NEXT_PUBLIC_ARCGIS_REDIRECT_URI=https://utilitx-pilot-a01bb.web.app/auth/arcgis
```

**Removed (no longer needed):**
- `ARCGIS_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `AUTH_PUBLIC_URL`
- Firebase functions config (`functions.config().arcgis.*`)
- Cookie or server OAuth vars

---

## ❌ **7. Legacy Methods Removed**

These features are **no longer part of UTILITX**:

### ❌ Server-side Routes
- `/api/auth/callback`
- `/api/auth/login`
- `/api/auth/check`

### ❌ Authentication Patterns
- Cookies (token, expiry, state)
- `next/headers` cookie parsing
- Firebase Functions-based redirects
- Middleware auth enforcement
- Client secret–based OAuth flow
- NextAuth patterns
- Stateful sessions / SSR auth

**All removed. PKCE stateless replaces them entirely.**

---

## 🔥 **8. Page Protection (Client-Only)**

Inside `/map`, `/work-areas`, `/dashboard`:

```typescript
const { isAuthenticated, login } = useArcGISAuth()

useEffect(() => {
  if (!isAuthenticated) login()
}, [isAuthenticated])
```

This is:
- Simple
- Bulletproof
- Loop-proof
- Production-safe

---

## 🛡 **9. Token Storage Policy**

### ✅ **Store in `sessionStorage`**
- Ephemeral, cleared on tab close
- No persistence bugs
- No SSR confusion
- No leakage
- No shared sessions

### ❌ **NEVER store in:**
- Cookies
- localStorage
- Server state

---

## 🧪 **10. Testing Instructions**

### **Test #1 — Clean Load**
1. Hard refresh (Shift+F5)
2. Go to `/map`
3. Should redirect → ArcGIS login → return with token → show map
4. Confirm token: DevTools → Application → Storage → sessionStorage

### **Test #2 — Token Expired**
1. Manually delete token
2. Reload `/dashboard`
3. Redirects to login again

### **Test #3 — Speed Check**
Login → redirect time should be **<1 second** after initial sign-in.

---

## 📦 **11. File Structure**

```
/lib/auth/arcgis-pkce.ts       # PKCE implementation
/lib/auth/get-token.ts         # Token helper functions
/contexts/ArcGISAuthContext.tsx # React auth context
/app/auth/arcgis/page.tsx      # OAuth callback handler
/middleware.ts                 # Minimal (no auth logic)
```

**Old routes removed.**

---

## 🏁 **12. Summary**

**UTILITX uses a pure SPA PKCE OAuth pattern.**

- No server code
- No cookies
- No secrets
- No SSR auth
- No stateful sessions
- No Firebase Functions involvement

This is the **correct, secure, scalable, production-ready** method for ArcGIS + React/Next.js SPAs.

---

## 📚 **13. Additional Resources**

- [ArcGIS OAuth 2.0 Documentation](https://developers.arcgis.com/documentation/mapping-apis-and-services/security/oauth-2.0/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [OAuth 2.1 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

*Last updated: November 2024*  
*Implementation: UTILITX Production v1.0*

