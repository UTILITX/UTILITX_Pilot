# UTILITX Logger Setup

## Overview

UTILITX uses a two-file logging setup:
1. **`lib/logger.ts`** - Frontend-safe logger (no firebase-functions dependency)
2. **`functions/src/logger.ts`** - Firebase Functions logger (uses structured logging)

## Frontend Logger (`lib/logger.ts`)

### Features
- ✅ No firebase-functions dependency (frontend-safe)
- ✅ Works in client-side and server-side (Next.js SSR)
- ✅ Formats logs with `[UTILITX] [SERVICE] operation` prefix
- ✅ Automatically captured by Firebase Functions when running in SSR

### Usage

```typescript
import { logger } from '@/lib/logger';

// Supabase operations
logger.supabase('upload', { file: 'example.pdf', bucket: 'Records_Private' });
logger.supabase('signed_url', { path: 'files/123.pdf' });

// Esri API operations
logger.esri('query', { layer: 'WorkAreas', features: 10 });

// GPT/OpenAI operations
logger.gpt('completion', { tokens: 150, model: 'gpt-4' });

// Flask backend operations
logger.flask('api_call', { endpoint: '/process', duration: 250 });

// Error logging
logger.error('supabase', 'upload', error, { file: 'example.pdf' });

// Performance logging
logger.performance('supabase', 'upload', 250, { file: 'example.pdf' });
```

### Log Format

```
[UTILITX] [SUPABASE] upload {
  service: "SUPABASE",
  operation: "upload",
  timestamp: "2024-01-01T00:00:00.000Z",
  file: "example.pdf",
  bucket: "Records_Private",
  ...
}
```

## Firebase Functions Logger (`functions/src/logger.ts`)

### Features
- ✅ Uses Firebase Functions structured logging
- ✅ Only available in Firebase Functions runtime
- ✅ Automatically structured for Firebase Console
- ✅ Can safely import firebase-functions

### Usage in Firebase Functions

```typescript
import { logger } from './logger';

// Supabase operations
logger.supabase('upload', { file: 'example.pdf' });

// Error logging
logger.error('supabase', 'upload', error, { file: 'example.pdf' });

// Performance logging
logger.performance('supabase', 'upload', 250, { file: 'example.pdf' });
```

### Log Format in Firebase Console

Structured logs appear in Firebase Console with:
- Service name (SUPABASE, ESRI, GPT, FLASK)
- Operation name
- Context data (file, duration, etc.)
- Timestamp
- Error details (if error)

## Integration

### Current Integration

The frontend logger is integrated into:
- `lib/supabase.ts` - Supabase upload and signed URL operations

### Future Integration

You can add logging to:
- Esri API calls in `lib/esriUtils.ts`
- GPT/OpenAI API calls (when implemented)
- Flask backend API calls (when implemented)

## Viewing Logs

### Local Development

Logs appear in browser console and terminal:
```
[UTILITX] [SUPABASE] upload { ... }
```

### Firebase Functions (Production)

View logs in Firebase Console:
1. Go to Firebase Console → Functions → Logs
2. Filter by function: `nextApp`
3. Search for `[UTILITX]` or service name

Or use CLI:
```bash
firebase functions:log --only nextApp
```

### Filtering Logs

In Firebase Console, you can filter by:
- `[UTILITX]` - All UTILITX logs
- `[SUPABASE]` - Supabase operations
- `[ESRI]` - Esri API operations
- `[GPT]` - GPT/OpenAI operations
- `[FLASK]` - Flask backend operations

## Benefits

1. **Consistent Format**: All logs use the same `[UTILITX] [SERVICE]` format
2. **Easy Filtering**: Search for service names in Firebase Console
3. **Structured Data**: Logs include context (file names, durations, etc.)
4. **Error Tracking**: Errors include stack traces
5. **Performance Monitoring**: Performance logs include durations
6. **Frontend-Safe**: No firebase-functions dependency in frontend code

## Example Log Output

### Local Development (Console)

```
[UTILITX] [SUPABASE] upload_start {
  service: "SUPABASE",
  operation: "upload_start",
  timestamp: "2024-01-01T00:00:00.000Z",
  file: "example.pdf",
  path: "1234567890-example.pdf",
  size: 1024
}

[UTILITX] [SUPABASE] upload {
  service: "SUPABASE",
  operation: "upload",
  timestamp: "2024-01-01T00:00:00.250Z",
  file: "example.pdf",
  path: "1234567890-example.pdf",
  bucket: "Records_Private",
  duration: "250ms",
  performance: true
}
```

### Firebase Functions (Structured Logs)

```json
{
  "severity": "INFO",
  "message": "SUPABASE upload",
  "service": "SUPABASE",
  "operation": "upload",
  "timestamp": "2024-01-01T00:00:00.250Z",
  "file": "example.pdf",
  "path": "1234567890-example.pdf",
  "bucket": "Records_Private",
  "duration": "250ms",
  "performance": true
}
```

## Best Practices

1. **Use consistent operation names**: `upload`, `download`, `query`, etc.
2. **Include relevant context**: file names, durations, error details
3. **Use appropriate log levels**: `info`, `warn`, `error`, `debug`
4. **Log performance metrics**: Use `logger.performance()` for timing
5. **Log errors with context**: Use `logger.error()` with error objects

## Troubleshooting

### Logs not appearing in Firebase Console

- Check that you're viewing the correct function (`nextApp`)
- Verify logs are being generated (check browser console locally)
- Ensure Firebase Functions is deployed and running

### Logs not structured in Firebase Console

- Frontend logger uses console, which is automatically captured
- Firebase Functions logger uses structured logging directly
- Both formats work, but Functions logger provides better structure

### Build warnings about firebase-functions

- ✅ Fixed: `lib/logger.ts` has no firebase-functions dependency
- ✅ Firebase Functions logger is in `functions/src/logger.ts` (separate file)
- ✅ Build completes with zero warnings

