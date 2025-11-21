# Local HTTPS Certificate Setup

This directory contains SSL certificates for local HTTPS development.

## Generate Certificates

### Option A: Using OpenSSL (Linux/Mac/WSL/Git Bash)

```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.crt -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

### Option B: Using mkcert (Recommended for Windows)

1. Install mkcert:
   ```bash
   # Using Chocolatey
   choco install mkcert
   
   # Or download from https://github.com/FiloSottile/mkcert/releases
   ```

2. Install local CA:
   ```bash
   mkcert -install
   ```

3. Generate certificate:
   ```bash
   mkcert localhost 127.0.0.1
   mv localhost+1-key.pem localhost.key
   mv localhost+1.pem localhost.crt
   ```

### Option C: Using Git Bash (Windows)

If you have Git Bash installed, it includes OpenSSL:

```bash
openssl req -x509 -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.crt -days 365 -subj "/CN=localhost"
```

## Files Required

- `localhost.key` - Private key file
- `localhost.crt` - Certificate file

## Trust the Certificate (Browser Warning)

After generating, you may need to trust the certificate to avoid browser warnings:

### Windows
1. Double-click `localhost.crt`
2. Click "Install Certificate"
3. Choose "Current User" → "Place all certificates in the following store" → "Trusted Root Certification Authorities"

### Mac
1. Double-click `localhost.crt`
2. Add to "login" keychain
3. Set trust to "Always Trust"

### Linux
Browser trust varies by distribution - usually automatic for localhost certificates.

