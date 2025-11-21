# HTTPS Setup for Local Development

ArcGIS OAuth **requires HTTPS** for redirect URLs. This guide shows you how to run your Next.js app locally with HTTPS.

## ✅ Quick Start (Recommended)

Next.js 14 has built-in HTTPS support with automatic certificate generation:

```bash
npm run dev:https
```

This will:
- Start the dev server at `https://localhost:3000`
- Auto-generate a self-signed certificate
- Work immediately (you may need to accept the certificate warning in your browser)

## 🔧 Manual Certificate Setup (Optional)

If you prefer to use your own certificates:

### Step 1: Generate Certificate

**Windows (Git Bash or WSL):**
```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout cert/localhost.key -out cert/localhost.crt -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

**Mac/Linux:**
```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout cert/localhost.key -out cert/localhost.crt -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

**Using mkcert (Easiest for Windows):**
```bash
# Install mkcert (using Chocolatey or download from GitHub)
choco install mkcert

# Install local CA
mkcert -install

# Generate certificate
mkcert localhost 127.0.0.1
mv localhost+1-key.pem cert/localhost.key
mv localhost+1.pem cert/localhost.crt
```

### Step 2: Trust the Certificate

**Windows:**
1. Double-click `cert/localhost.crt`
2. Click "Install Certificate"
3. Choose "Current User" → "Place all certificates in the following store" → "Trusted Root Certification Authorities"

**Mac:**
1. Double-click `cert/localhost.crt`
2. Add to "login" keychain
3. Right-click → "Get Info" → Trust → "Always Trust"

### Step 3: Run with Custom Certificate

```bash
npm run dev:https:custom
```

## 📝 Environment Variables

Update your `.env.local`:

```env
# For local HTTPS development
NEXT_PUBLIC_APP_URL=https://localhost:3000
ARCGIS_REDIRECT_URI=https://localhost:3000/api/auth/callback
```

## ✅ Register with ArcGIS

1. Go to your ArcGIS Portal → Developer Credentials
2. Add redirect URL: `https://localhost:3000/api/auth/callback`
3. Save changes

## 🎉 Test

1. Start dev server: `npm run dev:https`
2. Open browser: `https://localhost:3000`
3. Accept certificate warning (first time only)
4. Try logging in - OAuth should work!

## ⚠️ Important Notes

- **Production**: Uses HTTPS automatically (no setup needed)
- **Local Dev**: Must use HTTPS for OAuth to work
- **Browser Warning**: First time you'll see a security warning - click "Advanced" → "Proceed" (this is normal for self-signed certificates)

## 🐛 Troubleshooting

**Certificate warning keeps appearing:**
- Make sure you've trusted the certificate (see Step 2 above)
- Try clearing browser cache

**OAuth still not working:**
- Verify redirect URI in ArcGIS Portal matches exactly: `https://localhost:3000/api/auth/callback`
- Check `.env.local` has `NEXT_PUBLIC_APP_URL=https://localhost:3000`
- Make sure you're using `npm run dev:https` not `npm run dev`

