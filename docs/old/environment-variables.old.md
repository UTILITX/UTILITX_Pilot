# Environment Variables Setup

This document explains how to configure environment variables for deployment.

## Required Environment Variables

The following environment variables must be set in your deployment environment:

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ARCGIS_API_KEY` | ArcGIS API key for authentication | ✅ Yes |
| `NEXT_PUBLIC_WORKAREA_LAYER_URL` | ArcGIS Feature Layer URL for work areas | ✅ Yes |
| `NEXT_PUBLIC_RECORDS_LAYER_URL` | ArcGIS Feature Layer URL for records | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase instance URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ Yes |

## Setting Environment Variables

### For Vercel

1. Go to your project settings in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the `NEXT_PUBLIC_` prefix
4. Select the appropriate environments (Production, Preview, Development)
5. Redeploy your application

### For Netlify

1. Go to your site settings in Netlify
2. Navigate to **Site configuration** → **Environment variables**
3. Add each variable with the `NEXT_PUBLIC_` prefix
4. Redeploy your site

### For Firebase Hosting

Since Firebase Hosting is static, you'll need to:

1. Set environment variables in your CI/CD pipeline (GitHub Actions, etc.)
2. Or use Firebase Functions to inject them at build time
3. Or use a `.env.production` file (not recommended for sensitive keys)

### For Other Platforms

Most platforms support environment variables. Make sure to:

1. Set variables with the `NEXT_PUBLIC_` prefix
2. Redeploy after adding/changing variables
3. Check that variables are available at build time (not just runtime)

## Important Notes

### Static Export (`output: 'export'`)

This project uses Next.js static export (`output: 'export'`), which means:

- Environment variables are **baked into the JavaScript bundle at build time**
- Variables must be available **during the build process**, not just at runtime
- If variables are missing at build time, they will be `undefined` in production

### Debugging Missing Variables

If ArcGIS layers aren't loading in production:

1. **Check the browser console** - You should see logs like:
   ```
   🔧 ArcGIS Configuration:
     - API Key: ✅ Set
     - Work Area Layer: ✅ Set
     - Records Layer: ✅ Set
   ```

2. **If you see "❌ Missing"**, the variable wasn't set during the build:
   - Verify the variable is set in your deployment platform
   - Check that the variable name is exactly correct (case-sensitive)
   - Ensure the variable has the `NEXT_PUBLIC_` prefix
   - Redeploy after adding/changing variables

3. **Check for CORS errors** - If variables are set but layers still don't load:
   - Verify your ArcGIS API key has the correct permissions
   - Check that the layer URLs are correct
   - Ensure your API key is valid for the ArcGIS services

## Local Development

For local development, create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_ARCGIS_API_KEY=your_api_key_here
NEXT_PUBLIC_WORKAREA_LAYER_URL=https://services.arcgis.com/...
NEXT_PUBLIC_RECORDS_LAYER_URL=https://services.arcgis.com/...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Important:** Never commit `.env.local` to version control. It's already in `.gitignore`.

## Verification

After setting environment variables:

1. **Build locally** to verify:
   ```bash
   npm run build
   ```

2. **Check the build output** for any warnings about missing variables

3. **Deploy and check the browser console** for the configuration logs

4. **Test the map** - ArcGIS layers should load automatically

## Troubleshooting

### Variables are set but still not working

- **Clear browser cache** - Old builds might be cached
- **Hard refresh** - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Check build logs** - Verify variables were available during build
- **Verify variable names** - They must match exactly (case-sensitive)

### Layers load locally but not in production

- **Check deployment platform** - Variables might not be set in production
- **Verify build process** - Variables must be available at build time
- **Check API key permissions** - Production might have different restrictions
- **Review CORS settings** - ArcGIS services might restrict certain domains

### Getting "Configuration Error" toast

This means required environment variables are missing. Check:

1. Browser console for which variables are missing
2. Deployment platform settings
3. Build logs for any errors

