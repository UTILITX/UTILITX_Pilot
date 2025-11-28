# UTILITX AI Governance & Privacy Framework
**Version:** 1.0  
**Last Updated:** 2025-11-28  
**Owner:** UTILITX Founding Team  

---

## 1. Purpose
Defines the responsible use of AI within UTILITX for metadata extraction, geolocation inference, and decision support.

---

## 2. Scope of AI Use
UTILITX uses AI for:

1. Metadata extraction from engineering drawings  
2. Street/intersection clue detection  
3. Orientation and north arrow interpretation  
4. Document summarization  
5. Trust score estimation for geolocation confidence  

UTILITX **does not** use AI for:
- Safety-critical decision-making  
- Autonomously approving permits  
- Profiling or analysis involving personal data  

---

## 3. Data Minimization
- Only non-PII drawing content is sent to AI.  
- No user names, emails, or identifying information appear in prompts.  
- PII-containing drawings (rare) require manual review.

---

## 4. No Training on Customer Data
- UTILITX uses **stateless inference** through OpenAI.  
- Data is **never retained** for training.  
- Zero-retention mode enforced.

---

## 5. Transparency & Explainability
For each AI inference, UTILITX logs:

- Extracted streets/intersections  
- Inferred project location  
- Orientation metadata  
- Fallback logic  
- Trust score calculation  

---

## 6. Human Oversight
Municipal staff make final decisions.  
AI outputs are recommendations only.

---

## 7. Ethics & Bias
- No demographic data processed  
- No automated decision-making impacting individuals  
- No predictive modelling involving people  
- No high-risk AI behaviours  

---

## 8. Security
All AI requests are:

- Encrypted over TLS  
- Sanitized to remove PII  
- Logged internally for traceability  
- Routed through UTILITX backend (Render Cloud Run)

---

## 9. Deletion & Customer Rights
Customers may request deletion of any documents used for AI inference.

---
