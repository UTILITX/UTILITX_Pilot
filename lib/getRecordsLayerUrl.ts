// lib/getRecordsLayerUrl.ts

import { RECORDS_POINT_URL, RECORDS_LINE_URL, RECORDS_POLYGON_URL } from "./esriLayers";

/**
 * Returns the appropriate ArcGIS Feature Layer URL based on geometry type.
 * Routes uploads to the correct layer: Records_Point, Records_Line, or Records_Polygon.
 */
export const getRecordsLayerUrl = (geometryType: string): string | null => {
  switch (geometryType.toLowerCase()) {
    case "point":
      return RECORDS_POINT_URL;
    case "line":
    case "linestring":
    case "polyline":
      return RECORDS_LINE_URL;
    case "polygon":
      return RECORDS_POLYGON_URL;
    default:
      console.warn("Unknown geometry type:", geometryType);
      return null;
  }
};
