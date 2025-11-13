// lib/fetchAllEsriData.ts
import { queryEsriLayer } from "./esriQuery";

const RECORDS_POINT = process.env.NEXT_PUBLIC_RECORDS_POINT_LAYER_URL!;
const RECORDS_LINE = process.env.NEXT_PUBLIC_RECORDS_LINE_LAYER_URL!;
const RECORDS_POLYGON = process.env.NEXT_PUBLIC_RECORDS_POLYGON_LAYER_URL!;
const WORKAREAS = process.env.NEXT_PUBLIC_WORKAREA_LAYER_URL!;

export async function fetchAllRecordsFromEsri() {
  const [points, lines, polygons] = await Promise.all([
    queryEsriLayer(RECORDS_POINT),
    queryEsriLayer(RECORDS_LINE),
    queryEsriLayer(RECORDS_POLYGON),
  ]);

  const normalize = (f: any) => ({
    id: f.attributes?.record_id || f.attributes?.OBJECTID,
    geometryType: f.geometry?.type,
    attributes: f.attributes,
    geometry: f.geometry,
  });

  return [
    ...points.map(normalize),
    ...lines.map(normalize),
    ...polygons.map(normalize),
  ];
}

export async function fetchAllWorkAreasFromEsri() {
  const features = await queryEsriLayer(WORKAREAS);

  return features.map((f: any) => ({
    id: f.attributes?.workarea_id || f.attributes?.OBJECTID,
    attributes: f.attributes,
    geometry: f.geometry,
  }));
}
