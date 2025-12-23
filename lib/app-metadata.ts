import { version as packageVersion } from '../package.json';

const appVersion =
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.APP_VERSION ||
  packageVersion ||
  '0.0.0';

const release =
  process.env.SENTRY_RELEASE ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.APP_VERSION ||
  appVersion;

const environment =
  process.env.NEXT_PUBLIC_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_ENV ||
  process.env.NODE_ENV ||
  'development';

const commit =
  process.env.CI_COMMIT_SHA ||
  process.env.SENTRY_RELEASE ||
  process.env.GITHUB_SHA ||
  'local';

export { appVersion, release, environment, commit };

