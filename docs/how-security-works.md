# How Security, CI/CD, and Observability Work at UTILITX

## Purpose

This document explains how code changes move safely from development to deployment at UTILITX, how security is enforced automatically, and how issues are detected, reported, and fixed.

This system is designed to:

* Support rapid development (including AI-generated code)
* Enforce security automatically
* Provide clear audit evidence for pilots and future SOC 2 compliance

## High-Level Flow

1. Code is written locally (human or AI)
2. Code is pushed to GitLab
3. CI/CD enforces tests and security checks
4. Only passing code can be merged
5. Only CI can deploy to staging or production
6. Runtime behavior is continuously monitored and logged

At no point does a human manually “approve” insecure code.

## Continuous Integration (CI) — Enforcement Layer

UTILITX uses **GitLab CI/CD** as the enforcement mechanism.

### CI Stages

```
test → security → deploy
```

### What runs automatically

On every merge request and on protected branches (`staging`, `main`):

* Unit / integration tests
* Static Application Security Testing (SAST)
* Dependency vulnerability scanning
* Secret detection

If **any step fails**, the pipeline stops and the code cannot be merged or deployed.

## Continuous Security Testing

### Static Application Security Testing (SAST)

* Scans source code for insecure patterns
* Runs automatically on every merge request
* Prevents vulnerable code from being merged

### Dependency Scanning

* Scans third-party libraries for known CVEs
* Runs automatically on every merge request

### Secret Detection

* Scans commits for exposed secrets (API keys, tokens)
* Prevents accidental credential leaks

### Dynamic Application Security Testing (DAST)

* Runs against a deployed staging environment
* Executed automatically on a schedule or on merges to `main`
* Identifies runtime vulnerabilities (OWASP Top 10)

## Deployment Controls

* Deployments **only occur through CI jobs**
* No local or manual production deploys
* Each deployment includes:

  * Environment (`dev`, `staging`, `prod`)
  * Release identifier (commit / version)

This ensures all changes are traceable.

## Runtime Monitoring & Logging

### Error Monitoring

UTILITX uses **Sentry** to:

* Capture runtime errors
* Tag errors with environment and release
* Support rapid diagnosis and rollback

### Structured Logging

Application logs include:

* Environment
* App version
* Commit hash

Logs and errors can always be correlated to a specific deployment.

## Authentication

* User authentication is delegated to ArcGIS OAuth
* UTILITX does not store or manage passwords
* MFA and identity lifecycle controls are inherited from Esri

Additional auth providers may be added in future phases if required.

## What Happens When Something Goes Wrong

* CI failures block merges automatically
* Security scan findings are reported in GitLab
* Runtime errors appear in Sentry with full context
* All issues are tied to a specific release

## SOC 2 Alignment

This system directly supports:

* Secure SDLC
* Change management
* Access controls
* Monitoring and incident response
* Audit logging

Formal SOC 2 certification can be pursued later without re-architecting.

## Pre-Pilot Checklist

Before any pilot deployment:

* CI pipeline passing
* No secrets in repository
* Authentication enabled
* Monitoring active
* Logs and errors tagged with release metadata

