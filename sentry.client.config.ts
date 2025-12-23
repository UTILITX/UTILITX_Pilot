import * as Sentry from '@sentry/nextjs';
import { appVersion, environment, commit, release } from './lib/app-metadata';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment,
  release,
  tracesSampleRate: 0.05,
  beforeSend(event) {
    event.tags = {
      ...(event.tags ?? {}),
      environment,
    };

    event.extra = {
      ...(event.extra ?? {}),
      appVersion,
      commit,
    };

    return event;
  },
});

