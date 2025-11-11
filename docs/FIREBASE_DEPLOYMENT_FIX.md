# Firebase SSR Deployment Fix

## Problem

Firebase Functions deployment was failing with:
- "Could not find a production build in the .next directory"
- Next.js build files not accessible to Firebase Functions

## Root Cause

Firebase Functions only deploys files from the `functions` directory. The `.next` directory is built in the project root, but Firebase Functions can't access it during deployment.

## Solution

Created a deployment script that copies the Next.js build files into the `functions` directory before deployment.

## Changes Made

### 1. Created `functions/copy-next-build.js`

Cross-platform script that:
- Copies `.next` directory from root to `functions/.next`
- Copies `next.config.mjs` to `functions/`
- Copies `package.json` (as `package.json.next`) for dependency resolution
- Works on Windows, macOS, and Linux

### 2. Updated `firebase.json`

Added predeploy hook and runtime configuration:
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR/..\" run build",
      "node \"$RESOURCE_DIR/copy-next-build.js\""
    ]
  }
}
```

### 3. Updated `functions/src/index.ts`

Modified to detect `.next` directory location:
- First checks `functions/.next` (deployed location)
- Falls back to `../.next` (local development)

### 4. Updated `functions/.gitignore`

Added entries to prevent committing copied files:
```
.next/
next.config.mjs
package.json.next
```

## Deployment Process

The deployment now works as follows:

1. **Predeploy Hook 1**: Builds Next.js app (`npm run build`)
   - Creates `.next` directory in project root

2. **Predeploy Hook 2**: Copies build files (`copy-next-build.js`)
   - Copies `.next` → `functions/.next`
   - Copies `next.config.mjs` → `functions/next.config.mjs`
   - Copies `package.json` → `functions/package.json.next`

3. **Firebase Deploy**: Packages and deploys `functions` directory
   - Includes `functions/.next` directory
   - Includes `functions/src/index.ts` (compiled to `lib/index.js`)
   - Function can now access `.next` directory

## Testing

### Local Test

```bash
# Build Next.js
npm run build

# Copy build files
node functions/copy-next-build.js

# Verify files copied
ls functions/.next
```

### Deploy

```bash
# Clean build
rm -rf .next
npm run build

# Deploy (predeploy hooks run automatically)
firebase deploy
```

## Verification

After deployment, verify:

1. **Check Firebase Console → Functions → nextApp**
   - Function should be deployed
   - Runtime should show "nodejs20"

2. **Visit your app URL**
   - Should load without "Could not find production build" error
   - Dynamic routes should work

3. **Check logs**
   ```bash
   firebase functions:log --only nextApp
   ```
   - Should see "Next.js SSR Request" logs
   - No errors about missing .next directory

## Troubleshooting

### "Could not find production build" error

**Cause**: `.next` directory not copied to `functions/.next`

**Fix**:
1. Verify `copy-next-build.js` runs during predeploy
2. Check that `npm run build` succeeds before copy
3. Manually run: `node functions/copy-next-build.js`

### Function fails to start

**Cause**: `.next` directory path incorrect

**Fix**: Verify `functions/src/index.ts` checks both locations:
- `functions/.next` (deployed)
- `../.next` (local)

### Build files in git

**Cause**: `.gitignore` not updated

**Fix**: Ensure `functions/.gitignore` includes:
```
.next/
next.config.mjs
package.json.next
```

## Files Changed

1. `firebase.json` - Added predeploy hooks and runtime
2. `functions/copy-next-build.js` - New copy script
3. `functions/src/index.ts` - Updated distDir detection
4. `functions/.gitignore` - Added build file exclusions
5. `functions/package.json` - Added copy script

## Benefits

- ✅ Next.js build files included in deployment
- ✅ Cross-platform script (Windows, macOS, Linux)
- ✅ Automatic during `firebase deploy`
- ✅ Works in both local and deployed environments
- ✅ Build files excluded from git

