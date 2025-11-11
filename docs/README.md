# UTILITX Documentation

## Getting Started

- **[Deployment Guide](DEPLOYMENT.md)** - Complete deployment guide for Firebase SSR
- **[End-to-End Flow](end_to_end_flow)** - Application workflow overview
- **[Roadmap](roadmap)** - Development roadmap and phases

## Deployment & Configuration

- **[Deployment Guide](DEPLOYMENT.md)** - Main deployment documentation (includes Blaze plan setup)
- **[Firebase + Supabase Setup](firebase-supabase-setup.md)** - Supabase configuration for Firebase Functions
- **[Logger Setup](LOGGER_SETUP.md)** - Structured logging guide

## Archived Documentation

Old and redundant documentation has been moved to the [`old/`](old/) directory for reference.

## Quick Reference

### Deployment

```bash
npm run build
firebase deploy
```

### Environment Variables

```bash
firebase functions:config:set \
  supabase.url="..." \
  supabase.anon_key="..."
```

### View Logs

```bash
firebase functions:log --only nextApp
```

## Support

For deployment issues, see the [Deployment Guide](DEPLOYMENT.md) troubleshooting section.

