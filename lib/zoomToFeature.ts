/**
 * Utility functions to zoom to Esri feature geometry
 */

import L from "leaflet";
import type { LatLng } from "@/lib/record-types";

/**
 * Convert Esri geometry to Leaflet LatLng bounds
 * Handles both GeoJSON format (coordinates) and ArcGIS format (x/y, paths, rings)
 */
export function getBoundsFromEsriGeometry(geometry: any): L.LatLngBounds | null {
  if (!geometry) {
    console.warn("zoomToFeature: geometry missing or undefined", geometry);
    return null;
  }

  try {
    // Handle ArcGIS format (from REST API) - check structure first since it doesn't have a type field
    if (geometry.x !== undefined && geometry.y !== undefined) {
      // ArcGIS Point: { x: lng, y: lat }
      const lat = geometry.y;
      const lng = geometry.x;
      return L.latLngBounds(
        L.latLng(lat - 0.001, lng - 0.001),
        L.latLng(lat + 0.001, lng + 0.001)
      );
    }

    if (geometry.paths !== undefined) {
      // ArcGIS Polyline: { paths: [[[lng, lat], ...]] }
      const allLatlngs: L.LatLng[] = [];
      geometry.paths.forEach((path: number[][]) => {
        path.forEach(([lng, lat]: number[]) => {
          allLatlngs.push(L.latLng(lat, lng));
        });
      });
      if (allLatlngs.length === 0) return null;
      return L.latLngBounds(allLatlngs);
    }

    if (geometry.rings !== undefined) {
      // ArcGIS Polygon: { rings: [[[lng, lat], ...]] }
      const allLatlngs: L.LatLng[] = [];
      if (geometry.rings.length > 0) {
        // Use the exterior ring (first ring)
        geometry.rings[0].forEach(([lng, lat]: number[]) => {
          allLatlngs.push(L.latLng(lat, lng));
        });
      }
      if (allLatlngs.length === 0) return null;
      return L.latLngBounds(allLatlngs);
    }

    // Handle GeoJSON format (has type field)
    if (!geometry.type) {
      console.warn("zoomToFeature: geometry has no type and is not ArcGIS format", geometry);
      return null;
    }

    switch (geometry.type) {
      case "Point": {
        // GeoJSON Point: [lng, lat]
        const [lng, lat] = geometry.coordinates;
        const point = L.latLng(lat, lng);
        // For points, create a small bounds around the point
        return L.latLngBounds(
          L.latLng(lat - 0.001, lng - 0.001),
          L.latLng(lat + 0.001, lng + 0.001)
        );
      }

      case "LineString": {
        // GeoJSON LineString: [[lng, lat], [lng, lat], ...]
        const coords = geometry.coordinates as [number, number][];
        if (coords.length === 0) return null;
        
        const latlngs = coords.map(([lng, lat]) => L.latLng(lat, lng));
        return L.latLngBounds(latlngs);
      }

      case "Polygon": {
        // GeoJSON Polygon: [[[lng, lat], ...], ...] (first ring is exterior)
        const rings = geometry.coordinates as [number, number][][];
        if (rings.length === 0 || rings[0].length === 0) return null;
        
        // Use the exterior ring (first ring)
        const exteriorRing = rings[0];
        const latlngs = exteriorRing.map(([lng, lat]) => L.latLng(lat, lng));
        return L.latLngBounds(latlngs);
      }

      case "MultiPoint": {
        const points = geometry.coordinates as [number, number][];
        if (points.length === 0) return null;
        
        const latlngs = points.map(([lng, lat]) => L.latLng(lat, lng));
        return L.latLngBounds(latlngs);
      }

      case "MultiLineString": {
        const lines = geometry.coordinates as [number, number][][];
        if (lines.length === 0) return null;
        
        const allLatlngs: L.LatLng[] = [];
        lines.forEach((line) => {
          line.forEach(([lng, lat]) => {
            allLatlngs.push(L.latLng(lat, lng));
          });
        });
        return L.latLngBounds(allLatlngs);
      }

      case "MultiPolygon": {
        const polygons = geometry.coordinates as [number, number][][][];
        if (polygons.length === 0) return null;
        
        const allLatlngs: L.LatLng[] = [];
        polygons.forEach((polygon) => {
          if (polygon.length > 0) {
            polygon[0].forEach(([lng, lat]) => {
              allLatlngs.push(L.latLng(lat, lng));
            });
          }
        });
        return L.latLngBounds(allLatlngs);
      }

      default:
        console.warn("Unsupported geometry type:", geometry.type);
        return null;
    }
  } catch (error) {
    console.error("Error calculating bounds from geometry:", error, geometry);
    return null;
  }
}

/**
 * Get center point from Esri geometry (for point features or centroid)
 */
export function getCenterFromEsriGeometry(geometry: any): LatLng | null {
  if (!geometry) return null;

  try {
    switch (geometry.type) {
      case "Point": {
        const [lng, lat] = geometry.coordinates;
        return { lat, lng };
      }

      case "LineString":
      case "Polygon": {
        const bounds = getBoundsFromEsriGeometry(geometry);
        if (!bounds) return null;
        const center = bounds.getCenter();
        return { lat: center.lat, lng: center.lng };
      }

      default: {
        const bounds = getBoundsFromEsriGeometry(geometry);
        if (!bounds) return null;
        const center = bounds.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
    }
  } catch (error) {
    console.error("Error getting center from geometry:", error);
    return null;
  }
}

/**
 * Zoom map to Esri feature geometry
 * Accepts either a feature object with geometry property, or a geometry object directly
 */
export function zoomToEsriFeature(map: L.Map, featureOrGeometry: any, padding: number = 50): void {
  if (!map) {
    console.warn("zoomToEsriFeature: Map is not available");
    return;
  }

  // Handle both feature object and geometry object
  const geometry = featureOrGeometry?.geometry || featureOrGeometry;
  
  if (!geometry) {
    console.warn("zoomToEsriFeature: Feature has no geometry", featureOrGeometry);
    return;
  }

  const bounds = getBoundsFromEsriGeometry(geometry);
  if (!bounds) {
    console.warn("zoomToEsriFeature: No bounds returned, skipping zoom.");
    return;
  }

  try {
    map.fitBounds(bounds, {
      padding: [padding, padding],
      maxZoom: 18,
    });
  } catch (error) {
    console.error("Error fitting bounds:", error);
    // Fallback to center point if bounds calculation fails
    const center = getCenterFromEsriGeometry(geometry);
    if (center) {
      map.setView([center.lat, center.lng], 16);
    }
  }
}

