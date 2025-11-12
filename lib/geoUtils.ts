// lib/geoUtils.ts

/**
 * Safely extracts geometry from a record object.
 * Handles different record formats and provides fallbacks.
 */
export const getFeatureGeometry = (record: any) => {
  if (record.geometry) return record.geometry;

  if (record.feature?.geometry) return record.feature.geometry;

  console.warn("No geometry found for record:", record);

  return null;
};

