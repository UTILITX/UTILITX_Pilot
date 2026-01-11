// lib/fetchAllEsriData.ts
import { queryEsriLayer } from "./esriQuery";
import { RECORDS_POINT_URL, RECORDS_LINE_URL, RECORDS_POLYGON_URL, WORKAREA_URL } from "./esriLayers";

const RECORDS_POINT = RECORDS_POINT_URL;
const RECORDS_LINE = RECORDS_LINE_URL;
const RECORDS_POLYGON = RECORDS_POLYGON_URL;
const WORKAREAS = WORKAREA_URL;

export interface IndexedRecord {
  id: string;
  objectId: number | string | null; // ArcGIS OBJECTID - guaranteed unique per layer
  geometryType: "Point" | "LineString" | "Polygon";
  geometry: any;
  recordType: string | null;
  utilityType: string | null;
  organization: string | null;
  notes: string | null;
  fileUrl: string | null;
}

export async function fetchAllRecordsFromEsri(token?: string | null): Promise<IndexedRecord[]> {
  if (!token) {
    console.warn("[fetchAllRecordsFromEsri] ArcGIS OAuth token missing, skipping records fetch");
    return [];
  }

  const [points, lines, polygons] = await Promise.all([
    queryEsriLayer(RECORDS_POINT, token),
    queryEsriLayer(RECORDS_LINE, token),
    queryEsriLayer(RECORDS_POLYGON, token),
  ]);

  // Store original features with attributes for sorting
  const allFeatures: Array<{ record: IndexedRecord; creationDate?: string }> = [];

  const normalize = (f: any): IndexedRecord => {
    // Extract attributes - ensure we're reading from the correct location
    const attrs = f.attributes || {};
    
    // Debug: log attributes to verify they exist (only log first few to avoid spam)
    if (process.env.NODE_ENV === "development" && allFeatures.length < 3) {
      console.log("🔍 Feature attributes keys:", Object.keys(attrs));
      console.log("🔍 Sample attribute values:", {
        record_type: attrs.record_type,
        utility_type: attrs.utility_type,
        source: attrs.source,
        organization: attrs.organization,
        notes: attrs.notes,
        file_url: attrs.file_url,
        Creator: attrs.Creator,
        processed_date: attrs.processed_date,
      });
    }
    
    // Get geometry type from feature geometry or geometry_type attribute
    // ArcGIS REST API returns geometry in ArcGIS format, not GeoJSON
    let geomType: string | null = null;
    
    // First try the geometry_type attribute
    if (attrs.geometry_type) {
      geomType = attrs.geometry_type;
    }
    // If geometry has a type field (GeoJSON format), use it
    else if (f.geometry?.type) {
      geomType = f.geometry.type;
    }
    // Otherwise, infer from ArcGIS geometry structure
    else if (f.geometry) {
      if (f.geometry.x !== undefined && f.geometry.y !== undefined) {
        geomType = "Point";
      } else if (f.geometry.paths !== undefined) {
        geomType = "LineString";
      } else if (f.geometry.rings !== undefined) {
        geomType = "Polygon";
      }
    }
    
    // Validate and default if needed
    if (!geomType || !["Point", "LineString", "Polygon"].includes(geomType)) {
      console.warn(`⚠️ Invalid or missing geometry type: ${geomType}, using Point as default`);
      geomType = "Point";
    }
    
    // Get OBJECTID - this is guaranteed unique per layer in ArcGIS
    const objectId = attrs.OBJECTID ?? f.OBJECTID ?? null;
    
    // Create a unique ID by combining geometry type and OBJECTID
    // This ensures uniqueness across all layers (Point-1, Line-1, Polygon-1 are different)
    const uniqueId = objectId !== null 
      ? `${geomType}-${objectId}` 
      : attrs.Record_ID ?? attrs.record_id ?? String(Date.now() + Math.random());
    
    const record: IndexedRecord = {
      id: uniqueId,
      objectId: objectId,
      geometryType: geomType as "Point" | "LineString" | "Polygon",
      geometry: f.geometry,
      // Extract attributes correctly - note: organization is saved as "source" in ArcGIS
      recordType: attrs.record_type ?? attrs.Record_Type ?? null,
      utilityType: attrs.utility_type ?? attrs.Utility_Type ?? null,
      organization: attrs.source ?? attrs.organization ?? attrs.Organization ?? null,
      notes: attrs.notes ?? attrs.Notes ?? null,
      fileUrl: attrs.file_url ?? attrs.File_URL ?? null,
    };

    // Store creation date for sorting
    const creationDate = attrs.CreationDate ?? attrs.created_date ?? attrs.processed_date ?? attrs.timestamp;
    allFeatures.push({ record, creationDate });

    return record;
  };

  // Normalize all features
  points.forEach(normalize);
  lines.forEach(normalize);
  polygons.forEach(normalize);

  // Sort by creation date (newest first) if available
  allFeatures.sort((a, b) => {
    if (!a.creationDate && !b.creationDate) return 0;
    if (!a.creationDate) return 1;
    if (!b.creationDate) return -1;
    
    return new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime();
  });

  // Return sorted records
  return allFeatures.map(f => f.record);
}

export async function fetchAllWorkAreasFromEsri(token?: string | null) {
  if (!token) {
    console.warn("[fetchAllWorkAreasFromEsri] ArcGIS OAuth token missing, skipping work area fetch");
    return [];
  }

  const features = await queryEsriLayer(WORKAREAS, token);

  return features.map((f: any) => {
    const attrs = f.attributes || {};
    
    return {
      id: attrs.workarea_id || attrs.OBJECTID || String(f.OBJECTID || Date.now()),
      // Map Esri attributes to unified work area model
      name: attrs.name || attrs.work_area_name || attrs.title || `Work Area ${attrs.workarea_id || attrs.OBJECTID || ''}`,
      region: attrs.region || attrs.area || undefined,
      owner: attrs.owner || attrs.created_by || undefined,
      createdBy: attrs.created_by || attrs.creator || attrs.owner || undefined,
      date: attrs.created_date || attrs.timestamp || attrs.date || undefined,
      notes: attrs.notes || attrs.description || undefined,
      // Preserve geometry and raw attributes
      geometry: f.geometry,
      attributes: attrs, // Keep raw attributes for reference
      records: [], // Will be populated if needed
    };
  });
}
