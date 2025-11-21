// lib/esri-records.ts

import { RECORDS_POINT_URL, RECORDS_LINE_URL, RECORDS_POLYGON_URL } from "./esriLayers";

const RECORDS_POINT = RECORDS_POINT_URL;
const RECORDS_LINE = RECORDS_LINE_URL;
const RECORDS_POLYGON = RECORDS_POLYGON_URL;

/**
 * Converts LatLng[] polygon to ArcGIS JSON format for spatial queries
 */
function polygonToArcGIS(polygon: Array<{ lat: number; lng: number }>): any {
  // ArcGIS expects rings as [[[lng, lat], [lng, lat], ...]]
  const ring = polygon.map((p) => [p.lng, p.lat]);
  return {
    rings: [ring],
    spatialReference: { wkid: 4326 }, // WGS84
  };
}

/**
 * Converts Esri geometry to ArcGIS format for querying
 */
function esriGeometryToArcGIS(geometry: any): any | null {
  if (!geometry) return null;

  try {
    // Already in ArcGIS format (has rings)
    if (geometry.rings && Array.isArray(geometry.rings)) {
      return {
        rings: geometry.rings,
        spatialReference: geometry.spatialReference || { wkid: 4326 },
      };
    }

    // Handle GeoJSON Polygon
    if (geometry.type === "Polygon" && geometry.coordinates && geometry.coordinates[0]) {
      const rings = geometry.coordinates.map((ring: number[][]) =>
        ring.map((coord: number[]) => [coord[0], coord[1]]) // [lng, lat]
      );
      return {
        rings,
        spatialReference: { wkid: 4326 },
      };
    }
  } catch (error) {
    console.warn("Error converting geometry to ArcGIS format:", error);
  }

  return null;
}

/**
 * Queries all record layers (Point, Line, Polygon) for features within a polygon
 * Uses ArcGIS REST API directly for reliable spatial queries
 */
export async function queryRecordsInPolygon(
  polygon: Array<{ lat: number; lng: number }> | any
): Promise<any[]> {
  // Prevent SSR
  if (typeof window === "undefined") {
    return [];
  }

  // Convert polygon to ArcGIS format
  let arcgisGeometry: any;
  
  if (Array.isArray(polygon) && polygon.length > 0 && typeof polygon[0] === 'object' && 'lat' in polygon[0]) {
    // Already in LatLng[] format
    arcgisGeometry = polygonToArcGIS(polygon);
  } else if (polygon && typeof polygon === 'object') {
    // Esri geometry format
    arcgisGeometry = esriGeometryToArcGIS(polygon);
  } else {
    console.warn("Invalid polygon format");
    return [];
  }

  if (!arcgisGeometry) {
    console.warn("Could not convert polygon to ArcGIS format");
    return [];
  }

  const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY!;

  // Query all three record layers in parallel
  const queryPromises = [
    queryLayerWithGeometry(RECORDS_POINT, arcgisGeometry, apiKey),
    queryLayerWithGeometry(RECORDS_LINE, arcgisGeometry, apiKey),
    queryLayerWithGeometry(RECORDS_POLYGON, arcgisGeometry, apiKey),
  ];

  try {
    const [points, lines, polygons] = await Promise.all(queryPromises);
    
    // Combine all features
    const allFeatures = [...points, ...lines, ...polygons];
    
    // Extract properties/attributes from features
    return allFeatures.map((feature) => {
      const attrs = feature.attributes || feature.properties || {};
      return {
        utility_type: attrs.utility_type || attrs.Utility_Type || null,
        record_type: attrs.record_type || attrs.Record_Type || null,
        organization: attrs.source || attrs.organization || attrs.Organization || null,
        notes: attrs.notes || attrs.Notes || null,
        file_url: attrs.file_url || attrs.File_URL || null,
        geometry: feature.geometry,
        ...attrs, // Include all other attributes
      };
    });
  } catch (error) {
    console.error("Error querying records in polygon:", error);
    return [];
  }
}

/**
 * Helper to query a single Esri layer using ArcGIS REST API with spatial geometry
 */
async function queryLayerWithGeometry(
  layerUrl: string,
  geometry: any,
  apiKey: string
): Promise<any[]> {
  if (!layerUrl) {
    return [];
  }

  try {
    const cleanUrl = layerUrl.replace(/\/$/, "");
    const queryUrl = `${cleanUrl}/query`;

    const params = new URLSearchParams({
      f: "json",
      where: "1=1", // Get all features (spatial filter will be applied)
      geometry: JSON.stringify(geometry),
      geometryType: "esriGeometryPolygon",
      spatialRel: "esriSpatialRelIntersects", // Features that intersect the polygon
      outFields: "*", // Get all fields
      returnGeometry: "true",
      token: apiKey,
    });

    const response = await fetch(`${queryUrl}?${params.toString()}`);
    
    if (!response.ok) {
      console.error(`HTTP ${response.status} error querying ${layerUrl}`);
      return [];
    }

    const data = await response.json();
    
    if (data.error) {
      console.error(`ArcGIS query error for ${layerUrl}:`, data.error);
      return [];
    }

    return data.features ?? [];
  } catch (error) {
    console.error(`Error querying layer ${layerUrl}:`, error);
    return [];
  }
}

