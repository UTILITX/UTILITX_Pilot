# UTILITX Security Overview
**Version:** 1.0  
**Last Updated:** 2025-11-28  
**Owner:** UTILITX Founding Team  

---

## 1. Purpose
This document provides a high-level overview of the security controls supporting the UTILITX platform as it grows toward SOC2 and ISO 27001 readiness. It is intended for internal engineering, municipal IT teams, and utility partners.

---

## 2. Security Principles
UTILITX adheres to these core principles:

- **Least Privilege**
- **Zero Trust**
- **Secure by Design**
- **Data Minimization**
- **Evidence-Driven Operations**

---

## 3. Architecture Security

### 3.1 Encryption
- TLS 1.2+ for all data in transit  
- Provider-managed encryption at rest (Supabase, AGOL, Vercel, Firebase, Render)

### 3.2 Environment Segregation
- Separate **dev**, **stage**, and **prod** environments  
- Secrets scoped per environment

### 3.3 Secrets Management
- Vercel encrypted project secrets  
- No secrets committed to GitHub  
- Planned quarterly key rotation

---

## 4. Identity & Access Management (IAM)

### 4.1 Authentication
- OAuth PKCE (ArcGIS Online)  
- MFA required for internal accounts  
- Passwordless login via Supabase for internal team

### 4.2 Authorization
- Application-level RBAC (Admin / Editor / Viewer)  
- Supabase Row Level Security (RLS) for strict tenant isolation  
- No cross-municipality data sharing by default

---

## 5. Application Security Controls

### 5.1 Secure Development Practices
- Protected `main` branch (no direct commits)  
- PR reviews required  
- GitHub Dependabot vulnerability scanning  
- Linting and type checks on PRs

### 5.2 Logging & Monitoring
UTILITX logs the following events:

- Login events  
- WorkArea created/edited  
- Record uploaded/deleted  
- Sharing link created  
- Permission changes  
- API usage patterns

Logs include user ID, timestamp, and event context.

---

## 6. Data Handling & Storage

### 6.1 Accepted File Types
- PDF  
- TIFF  
- PNG  
- CAD (limited)  
- GeoJSON  

### 6.2 Storage Location
- Supabase Storage (private buckets)  
- Files accessed via short-lived signed URLs

### 6.3 Retention
- Default retention: **12 months**  
- Customer-requested deletion supported

### 6.4 Destruction Procedure
- Secure deletion using Supabase purge operations

---

## 7. Incident Response

### 7.1 Triggering Events
- Unauthorized access attempts  
- Data leakage  
- API key exposure  
- Suspicious file uploads  
- Availability degradation  
- AI misuse or failure  

### 7.2 Response Stages
1. **Detect**  
2. **Assess**  
3. **Contain**  
4. **Eradicate**  
5. **Recover**  
6. **Notify** (within 72 hours for confirmed impact)  
7. **Document** (final report within 7 days)

---

## 8. Vendor & Dependency Management
| Vendor | Purpose | Data Stored | Compliance |
|--------|---------|-------------|------------|
| Supabase | DB, storage, auth | Records, metadata, auth | SOC2 |
| ArcGIS Online | GIS layers | WorkAreas, Records | FedRAMP, SOC2 |
| Vercel | Frontend hosting | None | SOC2 |
| Firebase | Alternative hosting | None | SOC2, ISO |
| Render | AI backend | Temp images | SOC2 |
| Google Maps API | Geocoding | Street-level data | SOC2 |
| OpenAI | Metadata extraction | Drawing content (transient) | SOC2 |

---

## 9. Business Continuity & Backup
- Supabase automated daily backups  
- Weekly retention lifecycle  
- Quarterly restore testing (planned for customer onboarding)

---

## 10. SOC2 Roadmap (High Level)
- Quarterly access reviews  
- Secrets rotation process  
- Centralized logs  
- 3rd-party penetration test  
- Annual risk assessment  
- SOC2 Type I readiness in Series A phase

---
