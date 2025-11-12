// lib/getRecordsLayerUrl.ts

/**
 * Returns the appropriate ArcGIS Feature Layer URL based on geometry type.
 * Routes uploads to the correct layer: Records_Point, Records_Line, or Records_Polygon.
 */
export const getRecordsLayerUrl = (geometryType: string): string | null => {
  switch (geometryType.toLowerCase()) {
    case "point":
      return process.env.NEXT_PUBLIC_RECORDS_POINT_LAYER_URL || null;
    case "line":
    case "linestring":
    case "polyline":
      return process.env.NEXT_PUBLIC_RECORDS_LINE_LAYER_URL || null;
    case "polygon":
      return process.env.NEXT_PUBLIC_RECORDS_POLYGON_LAYER_URL || null;
    default:
      console.warn("Unknown geometry type:", geometryType);
      return null;
  }
};

