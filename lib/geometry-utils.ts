const EARTH_RADIUS_METERS = 6378137

type GeoJsonPolygon = {
  type: "Polygon"
  coordinates: number[][][]
}

const toRadians = (value: number) => (value * Math.PI) / 180

const closeRing = (ring: number[][]) => {
  if (!ring.length) return []
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring
  }
  return [...ring, first]
}

export function convertArcGISToGeoJSONPolygon(geometry: any): GeoJsonPolygon | null {
  if (!geometry) return null

  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring: number[][]) => closeRing(ring)),
    }
  }

  const rings = geometry.rings || geometry.paths || geometry.coordinates
  if (!Array.isArray(rings)) return null

  const normalized = rings
    .map((ring: number[][]) => {
      if (!Array.isArray(ring)) return null
      const mapped = ring.map((coord) => {
        if (!Array.isArray(coord) || coord.length < 2) return [0, 0]
        const [x, y] = coord
        return [x, y]
      })
      return closeRing(mapped)
    })
    .filter(Boolean) as number[][][]

  if (!normalized.length) return null

  return {
    type: "Polygon",
    coordinates: normalized,
  }
}

// Detect if coordinates are likely in a projected (meter) CRS rather than lon/lat degrees.
// Web Mercator / local projected systems will typically exceed lon/lat ranges.
const isProjectedRing = (ring: number[][]): boolean => {
  return ring.some(([x, y]) => Math.abs(x) > 360 || Math.abs(y) > 180)
}

// Planar (projected) ring area using the shoelace formula; assumes units are meters.
const planarRingAreaSqm = (coordinates: number[][]): number => {
  let sum = 0
  const length = coordinates.length
  if (length < 3) return 0

  for (let i = 0; i < length - 1; i += 1) {
    const [x1, y1] = coordinates[i]
    const [x2, y2] = coordinates[i + 1]
    sum += x1 * y2 - x2 * y1
  }

  return Math.abs(sum) / 2
}

// Spherical excess ring area for lon/lat coordinates (in radians).
const sphericalRingArea = (coordinates: number[][]): number => {
  let area = 0
  const length = coordinates.length
  if (length < 3) return 0

  for (let i = 0; i < length; i += 1) {
    const [lon1, lat1] = coordinates[i]
    const [lon2, lat2] = coordinates[(i + 1) % length]
    area += (toRadians(lon2) - toRadians(lon1)) * (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)))
  }

  return area
}

export function calculateGeoJSONAreaSqm(polygon: GeoJsonPolygon | null): number {
  if (!polygon || !Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) return 0

  const firstRing = polygon.coordinates[0]
  const projected = isProjectedRing(firstRing)

  if (projected) {
    // Use planar area in square meters for projected geometries
    return polygon.coordinates.reduce((sum, ring) => sum + planarRingAreaSqm(ring), 0)
  }

  // Fallback to spherical area for lon/lat (WGS84) coordinates
  const area = polygon.coordinates.reduce((sum, ring) => sum + sphericalRingArea(ring), 0)
  return Math.abs(area) * (EARTH_RADIUS_METERS ** 2) / 2
}

export type { GeoJsonPolygon }



