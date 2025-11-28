UTILITX Data Flow Diagram & Narrative
Version: 1.0
Last Updated: 2025-11-28

# UTILITX Data Flow Diagram & Narrative
**Version:** 1.0  
**Last Updated:** 2025-11-28  
**Owner:** UTILITX Founding Team  

---

## 1. Purpose
This document describes how data flows through the UTILITX platform.  
It is intended for municipal IT teams, utilities, partners, and auditors.

---

## 2. High-Level Summary
- Data enters UTILITX through **file uploads** (PDFs, TIFFs, CAD, images) or **GIS layers** (AGOL).  
- Files are sent to the **AI Georeferencing Engine** for metadata extraction.  
- Metadata + location results are written to **Supabase PostGIS**.  
- Frontend (Next.js) retrieves processed info through **secured APIs**.  
- All user actions (upload, edit, share) generate **audit logs**.  
- No customer data is used for AI training.

---

## 3. Data Flow Diagram (ASCII)


             ┌──────────────────┐
             │  Municipal User  │
             │  Utility Owner   │
             └───────┬──────────┘
                     │
                     │ 1. Upload Files / Draw WorkArea
                     ▼
           ┌─────────────────────────┐
           │   UTILITX Frontend      │
           │   Next.js (Vercel)      │
           └───────────┬────────────┘
                       │
                       │ 2. Send file + metadata
                       ▼
          ┌──────────────────────────┐
          │  UTILITX FastAPI Backend │
          │  AI / Geospatial Engine  │
          │  (Render Cloud Run)      │
          └───────────┬─────────────┘
                      │
    ┌─────────────────┼──────────────────┐
    │                 │                  │
    │3a. Store Files  │3b. AI Processing │3c. Geocoding
    ▼                 ▼                  ▼


┌────────────────┐ ┌───────────────────┐ ┌─────────────────────┐
│ Supabase │ │ OpenAI Vision │ │ Google Maps API │
│ Storage (S3) │ │ Metadata Extract │ │ Intersection Lookup │
└───────┬────────┘ └──────────┬────────┘ └──────────┬──────────┘
│ │ │
│ │ 4. Extracted fields │
│ └───────────┬──────────┘
│ │
└──────────────────────────────┬──┘
▼
┌──────────────────┐
│ Supabase PostGIS │
│ Metadata, Geo │
└────────┬─────────┘
│
│ 5. Read for Map/UI
▼
┌─────────────────────────┐
│ UTILITX Frontend (Map) │
│ Overview, Records, │
│ Completeness, Sharing │
└─────────────────────────┘


---

## 4. Detailed Data Steps

### **Step 1: User Input**
Users can:
- Upload PDFs, TIFFs, images, CAD  
- Draw WorkArea polygons  
- Attach metadata  
- Request sharing links  

No PII is required beyond login email.

---

### **Step 2: Frontend → Backend**
Frontend packages:
- File  
- WorkArea ID  
- Region / bounding box  
- Session token (Supabase)  

And sends it to the backend `/process` endpoint.

---

### **Step 3: Backend Processing**
Backend handles:
- File validation  
- Rendering (PDF → image tiles)  
- Running GPT-Vision on tiles  
- Extracting intersections & metadata  
- Running geocoders (Google Maps)  
- Trust scoring  
- Logging  

---

### **Step 4: Data Storage**
Supabase PostGIS stores:
- File metadata  
- Extracted attributes  
- Location result (lat/lon, trust score)  
- Geometry for map layers  
- Audit logs  

Supabase Storage holds:
- PDF/TIFF assets  
- Rendered tile images (optional transient)

---

### **Step 5: Frontend Visualization**
Frontend reads from PostGIS:
- WorkArea geometry  
- Record metadata  
- Extracted location  
- Trust score  
- User access controls  

Map is rendered using:
- Leaflet + Esri + Geoman  
- Google Maps basemaps or Esri basemaps  

---

## 5. AI Data Handling
- Only **drawing text & geometry clues** sent to AI.  
- No PII.  
- No training.  
- No model retention.  
- All inference routed through UTILITX backend.  

---

## 6. Data Residency
Default: **Canada region** (Supabase + Vercel + Render)  
Backups: Same region  
Geocoding: Google Maps (US), but **only street names/intersections** transmitted.  

---

## 7. Security Controls Applied to Data
- TLS 1.2+  
- Encrypted storage  
- RLS per tenant  
- Signed URL access  
- Access logging  
- Audit trails  

---

## 8. Retention & Deletion
- 12-month retention  
- Immediate deletion upon request  
- Secure purge using Supabase object deletion  

---

## 9. Last Review
Reviewed quarterly or upon architectural change.

---
