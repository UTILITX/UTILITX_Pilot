// lib/arcgis/config.ts
export const ARCGIS_PORTAL_URL =
  process.env.NEXT_PUBLIC_ARCGIS_PORTAL_URL ||
  "https://indib78f3690c643.maps.arcgis.com";

export const ARCGIS_CLIENT_ID =
  process.env.NEXT_PUBLIC_ARCGIS_CLIENT_ID ?? "";

export const WORK_AREAS_LAYER_URL =
  process.env.NEXT_PUBLIC_ARCGIS_WORK_AREAS_URL ??
  "https://services7.arcgis.com/ViYWM4c7kDH7CSCe/arcgis/rest/services/UTILITX_WorkAreas/FeatureServer/0";

export const WORK_AREAS_SERVER_URL =
  process.env.NEXT_PUBLIC_ARCGIS_WORK_AREAS_SERVER_URL ??
  "https://services7.arcgis.com/ViYWM4c7kDH7CSCe/arcgis/rest";

