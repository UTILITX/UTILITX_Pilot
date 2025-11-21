/**
 * Converts GeoJSON geometry to ArcGIS JSON format
 * Leaflet uses GeoJSON, but ArcGIS REST API expects ArcGIS JSON format
 */
function geoJSONToArcGIS(geoJSONGeometry: any): any {
  if (!geoJSONGeometry || !geoJSONGeometry.type) {
    throw new Error("Invalid GeoJSON geometry");
  }

  const spatialReference = { wkid: 4326 }; // WGS84

  switch (geoJSONGeometry.type) {
    case "Point": {
      // GeoJSON: [lng, lat]
      // ArcGIS: { x: lng, y: lat, spatialReference }
      const [lng, lat] = geoJSONGeometry.coordinates;
      return {
        x: lng,
        y: lat,
        spatialReference,
      };
    }

    case "LineString": {
      // GeoJSON: [[lng, lat], [lng, lat], ...]
      // ArcGIS: { paths: [[[lng, lat], [lng, lat], ...]], spatialReference }
      const path = geoJSONGeometry.coordinates.map((coord: number[]) => [coord[0], coord[1]]);
      return {
        paths: [path],
        spatialReference,
      };
    }

    case "Polygon": {
      // GeoJSON: [[[lng, lat], [lng, lat], ...]] (first ring is exterior, rest are holes)
      // ArcGIS: { rings: [[[lng, lat], [lng, lat], ...]], spatialReference }
      const rings = geoJSONGeometry.coordinates.map((ring: number[][]) =>
        ring.map((coord: number[]) => [coord[0], coord[1]])
      );
      return {
        rings,
        spatialReference,
      };
    }

    default:
      throw new Error(`Unsupported geometry type: ${geoJSONGeometry.type}`);
  }
}

// Note: The old createAuthenticatedFeatureLayer and addFeatureToLayer functions
// have been removed. Use the new save functions in lib/esri/ instead:
// - saveWorkArea
// - saveRecordPoint
// - saveRecordLine
// - saveRecordPolygon
// These functions use FeatureLayer directly and rely on ArcGIS JS API's
// automatic OAuth token handling via cookies.
