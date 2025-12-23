# Security & CI Guardrails

## 1. Environments

| Environment | Purpose | CI Flag |
| ----------- | ------- | ------- |
| `dev` | Local development / experimentation | Only used on local machines, no CI deploy |
| `staging` | Pilot & demo deployments | Triggered via `deploy_staging` job in `.gitlab-ci.yml` |
| `prod` | Future production deployments | Triggered via `deploy_prod` job in `.gitlab-ci.yml` |

All tooling, documentation, and dashboards (GitLab CI, Cloudflare, Sentry, monitoring) must use these names so downstream automation understands intent.

## 2. GitLab CI Security Pipeline

`​.gitlab-ci.yml` defines the mandatory stages: `test`, `security`, `deploy`. Each merge request or default branch commit runs:

* `lint` job (`npm ci && npm run lint`). It gates the project before any security job runs.
* GitLab templates for SAST, Secret Detection, and Dependency Scanning run in the `security` stage. These jobs never pass silently—failures stop the pipeline.
* Deploy jobs are the only path into Firebase. `deploy_staging` runs on the `staging` branch and `deploy_prod` on the default branch (`main`). Each deploy job runs `npm ci`, `npm run build`, and `npm run deploy`.

`workflow.rules` limit pipelines to merge requests, the default branch, and the `staging` branch, making CI the sole source of truth.

## 3. Merge Protection

Protect `main` (default branch) in **GitLab → Settings → Repository → Protected branches**:

1. Require passing pipeline before merge.
2. Require at least one reviewer.
3. Block merges when any security job (SAST, Dependency Scanning, Secret Detection) fails.

This enforcement layer prevents bypassing the automated scans. No manual overrides, force pushes, or skipped pipelines are permitted on `main`.

## 4. Secrets & Environment Discipline

* Store secrets only in GitLab CI Variables (or Doppler if we onboard it). Example keys: `FIREBASE_TOKEN`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`.
* Never commit `.env` files or secrets into Git. `.env*` is already ignored in `.gitignore`. Keep `.env.local` for local dev only.
* Prod secrets are scoped to the deploy jobs via protected variable masks and environment scoped values.
* Document the owner of each secret in GitLab (key description) so auditors see accountability.

## 5. Cloudflare Edge Protection

Cloudflare fronts every public URL:

* Move DNS (`utilitx-pilot.web.app` + custom domains) into Cloudflare.
* Enable HTTPS everywhere and automatic TLS renewal.
* Turn on rate limiting for `/api/*` paths (e.g., max requests per minute) and block requests with empty User-Agent headers to stop automated abuse.
* Monitor the Cloudflare dashboard and capture screenshots before pilot deployments to prove protection is active.

## 6. Authentication Status

* The UI currently uses **AGOL OAuth** via the ArcGIS contexts (`ArcGISAuthContext`). No change to this flow is required for now.
* Managed auth providers (Supabase/Auth0) may be evaluated later, but AGOL OAuth remains the approved method for this pilot.
* Ensure admin accounts have MFA enabled on AGOL and no shared credentials exist.

## 7. Deployment Discipline

* CI is the only deploy path (`deploy_staging` and `deploy_prod`). Local scripts (`scripts/deploy-to-production.sh`/`.ps1`) exist for reference or emergency fixes but must not be used in place of the pipeline unless CI is unavailable—then document the outage and follow the incident response runbook.
* Deploy jobs capture `NEXT_PUBLIC_ENVIRONMENT` and `SENTRY_RELEASE`, so release metadata is always tied to a pipeline run.
* Every deploy job logs:
  * The user who triggered it (GitLab handles this).
  * The commit hash (`SENTRY_RELEASE`).
  * The environment name.

## 8. Monitoring & Logging

* Add Sentry to frontend/backend (see Phase 3 of the plan). Tag every event with `environment`, `release` (`CI_COMMIT_SHA`), and `appVersion`.
* Required env variables: `NEXT_PUBLIC_SENTRY_DSN` (client), `SENTRY_DSN` (server), `NEXT_PUBLIC_APP_VERSION`, and `SENTRY_RELEASE` (CI-provided commit hash). These feed `lib/app-metadata.ts`, which centralizes `environment`, `appVersion`, `release`, and `commit` for every log/message.
* Use `lib/logger.ts` for structured logs. Every entry now includes `environment`, `appVersion`, and `commit` metadata so Firebase Functions, Supabase, and frontend logs can be correlated.

## 9. Pre-Pilot Checklist (use before each rollout)

1. CI pipeline is passing (lint + security jobs succeeded).
2. No secrets are stored in the repo; GitLab variables hold them.
3. AGOL OAuth is configured with MFA for admin users.
4. Cloudflare is active with HTTPS, TLS, and `/api/*` rate limiting.
5. Sentry is receiving events from staging, and releases are visible.
6. Logs include the user, environment, and version metadata.

When all boxes are checked, the deploy may proceed.

## 10. SOC 2 Control Mapping

All controls below cover `staging` (pilot) and `prod` (future) environments. We do not claim SOC 2 compliance; we simply document the controls auditors expect.

| Trust Category | Requirement | UTILITX Control | Evidence |
| -------------- | ----------- | --------------- | -------- |
| **CC1 – Control Environment** | Management assigns security responsibility | CI is the enforcement layer (no manual overrides). Rules documented in this file. | `.gitlab-ci.yml`, [docs/security-and-ci.md](./security-and-ci.md) |
| **CC2 – Communication & Info** | Expectations are communicated | Cursor doc + GitLab merge requests share the guardrails. | This doc, MR descriptions |
| **CC3 – Risk Assessment** | Automate detection of code issues | SAST, Dependency Scanning, Secret Detection jobs run on every MR and `main`. | GitLab pipeline logs |
| **CC4 – Monitoring Activities** | Detect anomalous behavior | Sentry captures errors tagged by environment/release. | Sentry dashboard, `SENTRY_RELEASE` env var |
| **CC5 – Access Controls** | Separate identities & MFA | AGOL OAuth plus MFA for admins, no shared credentials. | AGOL admin console screenshots |
| **CC6 – System Operations** | Secure deployment & vulnerability protection | CI-only deploy, Cloudflare edge protection, security job failures block pipeline. | `.gitlab-ci.yml`, Cloudflare settings |
| **CC7 – Change Management** | Authorized, tested, traceable changes | Protected branches + required reviews + structured pipelines. | GitLab protected branch settings, MR history |
| **A1 – Availability** | Shield against downtime | Cloudflare plus Sentry alerts reduce downtime scope. | Cloudflare analytics, Sentry alerts |
| **C1 – Confidentiality** | Secrets & TLS protection | GitLab CI variables, no `.env` commits, HTTPS via Cloudflare. | GitLab variable config, Cloudflare TLS status |
| **PI1 – Processing Integrity** | Traceable processing | Structured logs + Sentry errors tagged with `env`/`version`. | `lib/logger.ts`, Sentry releases |

## 11. Supporting Docs

* [`docs/security/incident-response.md`](./security/incident-response.md)
* [`docs/security/architecture-overview.md`](./security/architecture-overview.md)
* [`docs/PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md)

Revisit this doc whenever CI guardrails change or new security tooling is added.

