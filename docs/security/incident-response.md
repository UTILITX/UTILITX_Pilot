# UTILITX Incident Response Plan (IRP)
**Version:** 1.0  
**Last Updated:** 2025-11-28  

---

## 1. Purpose
Defines UTILITX procedures to detect, contain, respond to, and recover from security incidents.

---

## 2. Incident Categories
- Unauthorized access  
- Data leakage or disclosure  
- API key exposure  
- Malware or harmful uploads  
- Service degradation or outages  
- AI misuse or incorrect inference  

---

## 3. Roles & Responsibilities
| Role | Responsibility |
|------|----------------|
| Incident Lead | Overall coordination |
| Engineering | Technical containment & recovery |
| Customer Liaison | Customer communications |
| Documentation Lead | Incident report creation |

---

## 4. Response Workflow

### 4.1 Detect
- Logs  
- Alerts  
- Customer reports  
- Vulnerability notifications  

### 4.2 Assess
- Scope  
- Severity  
- Impacted users  
- Data affected  

### 4.3 Contain
- Revoke credentials  
- Disable affected systems  
- Block malicious IPs  
- Suspend file ingestion  

### 4.4 Eradicate
- Patch vulnerabilities  
- Remove malicious files  
- Reset secrets  

### 4.5 Recover
- Restore services  
- Validate data integrity  
- Increase monitoring temporarily  

### 4.6 Notify
Affected customers notified **within 72 hours** if impact confirmed.

### 4.7 Document
Incident report completed within **7 days**.

---
