ChatGPT said:

Perfect — here are both documents, fully formatted for GitHub Markdown and ready to drop into your /docs folder.

I will generate:

data-flow.md

architecture-overview.md

Both include ASCII diagrams that render cleanly in any Markdown viewer (GitHub, VSCode, Cursor), plus a clear narrative for municipal IT and engineering.

If you'd like PNG diagram versions, I can generate those next.

✅ DOC #1 — /docs/security/data-flow.md

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

✅ DOC #2 — /docs/product/architecture-overview.md

UTILITX System Architecture Overview
Version: 1.0
Last Updated: 2025-11-28

# UTILITX System Architecture Overview  
**Version:** 1.0  
**Last Updated:** 2025-11-28  
**Owner:** UTILITX Founding Team  

---

## 1. Purpose
This document provides a high-level architecture overview of the UTILITX platform, including the frontend, backend, geospatial engine, AI processing stack, and storage layers.

---

## 2. Architecture Diagram (ASCII)


                       ┌─────────────────────────┐
                       │  UTILITX Frontend       │
                       │  Next.js (Vercel)       │
                       │  Leaflet + Esri + PM    │
                       └───────────┬─────────────┘
                                   │
                                   │ 1. API Requests / Auth
                                   ▼
                   ┌─────────────────────────────────┐
                   │ UTILITX Backend (FastAPI)       │
                   │ Geospatial + AI Pipeline        │
                   │ Hosted on Render Cloud Run      │
                   └───────────┬─────────────────────┘
                               │
         ┌─────────────────────┼──────────────────────────────┐
         │                     │                              │
         ▼                     ▼                              ▼


┌────────────────┐ ┌────────────────────────┐ ┌─────────────────────┐
│ Supabase │ │ OpenAI Vision (GPT-4o) │ │ Google Maps API │
│ PostGIS + Auth │ │ Metadata Extraction │ │ Geocoding │
└───────┬────────┘ └─────────┬──────────────┘ └───────────┬─────────┘
│ │ │
│ 2. Store + Query │ 3. Extract fields │ 3. Validate intersection
└───────────┬─────────┴────────────────────────────────┘
▼
┌───────────────────────────┐
│ Supabase Storage (S3) │
│ File Uploads + Tiles │
└───────────────────────────┘


---

## 3. Component Breakdown

### **3.1 Frontend (Next.js + Vercel)**
- Multi-panel workspace (Overview, Records, Insights, Share)  
- WorkArea polygon drawing using Leaflet-Geoman  
- Esri basemap integration  
- Real-time completeness and record visualizations  
- File uploader (PDF/TIFF/CAD/Image)  
- Signed URL access to Supabase Storage  
- Strict role-based visibility  

---

### **3.2 Backend (FastAPI on Render Cloud Run)**
Core responsibilities:

- File ingestion  
- PDF → image rendering  
- AI metadata extraction  
- Intersection inference  
- Geocoding with Google Maps  
- Trust score calculation  
- Logging + audit trails  
- Writing results to PostGIS  

Endpoints include:

- `POST /process` — main georeferencing pipeline  
- `POST /records` — record upload metadata  
- `GET /records/{work_area}`  
- `GET /health` — health check  

---

### **3.3 AI Geospatial Engine**
Modules:

1. **Image Renderer**: Converts PDF pages into high-res tiles  
2. **Vision Extractor**: GPT-4o Vision used for:  
   - Title blocks  
   - Street names  
   - Orientation clues  
   - Cross-street extraction  
3. **Intersection Selector**  
   - Validates extracted intersections using target region  
   - Rejects out-of-bound matches  
4. **GeoCoder Module**  
   - Google Maps → lat/lon  
   - Fallbacks with bounding box constraints  
5. **Trust Score Engine**  
   - Blends metadata, extraction clarity, intersection consistency  

---

### **3.4 Database (Supabase PostGIS)**
Stores:

- WorkArea geometries  
- Record metadata  
- AI extraction outputs  
- Geocoded lat/lon  
- Trust scores  
- Logs  
- User roles  

Key features:

- RLS for tenant isolation  
- Spatial indexing (GEOGRAPHY)  
- JSONB metadata columns  

---

### **3.5 Storage (Supabase Storage)**
Stores:

- PDFs  
- TIFFs  
- CAD assets  
- Rendered image tiles  
- Optional debug images  

All stored in private buckets with signed URL access.

---

### **3.6 GIS Integration**
- Esri basemaps via REST services  
- Leaflet for display  
- Geoman for draw/edit  
- GeoJSON export + import  
- Future: Real-time AGOL syncing  

---

## 4. Authentication & Authorization

### **Authentication**
- ArcGIS OAuth PKCE  
- Supabase Auth for local/non-AGOL flows  
- JWT-based session tokens  

### **Authorization**
- Admin  
- Editor  
- Viewer  
- All enforced through RLS policies + frontend gating  

---

## 5. Security Controls Summary
- TLS encryption  
- RLS per tenant  
- Protected backend (no direct public file access)  
- No AI training on customer data  
- AI requests routed through backend (not browser)  
- Signed URLs for file access  
- Audit logging for all CRUD actions  

---

## 6. Deployment Architecture

### **Frontend**
- Hosted on Vercel global edge  
- Uses API routes pointing to FastAPI endpoint  
- Optimized static + dynamic rendering  

### **Backend**
- Stateless containers on Render Cloud Run  
- Autoscaling  
- Environment-level API keys  

### **Database**
- Supabase (Postgres + PostGIS)  
- Automatic daily backups  
- Point-in-time restoration  

### **Storage**
- Supabase object storage  
- Access controlled by signed URLs  

---

## 7. Future Architecture Enhancements
- Event-driven ingestion pipeline  
- Real-time styling & layer updates  
- Multi-tenant isolation at schema level  
- Dedicated monitoring (Datadog / Grafana)  
- SOC2 logging bundle  

---

## 8. Review Cycle
This architecture overview is reviewed quarterly or with any major feature addition.

---
