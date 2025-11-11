# Basemap Vector Migration Guide

## Current Status

Currently using `EL.basemapLayer()` which shows a deprecation warning but is fully functional.

## Deprecation Warning

```
BasemapLayer.js:241 WARNING: L.esri.BasemapLayer uses data services that are in mature support...
```

This warning is **safe to ignore** for now. The basemapLayer still works correctly.

## Future Migration

When esri-leaflet adds full Vector module support, migrate to:

```typescript
import * as EL from "esri-leaflet";

// Future vector basemap (when available)
const basemaps = {
  Streets: EL.Vector.vectorBasemapLayer("ArcGIS:Streets", {
    apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
  }),
  Topographic: EL.Vector.vectorBasemapLayer("ArcGIS:Topographic", {
    apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
  }),
};
```

## Alternative: Direct Vector Tile Services

If vector basemaps are needed before esri-leaflet adds support, you can use vector tile services directly:

```typescript
const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY!
const basemaps = {
  Streets: L.tileLayer(
    `https://basemaps-api.arcgis.com/arcgis/rest/services/styles/ArcGIS:Streets?token=${apiKey}&tile={z}/{y}/{x}`,
    {
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
      maxZoom: 19,
    }
  ),
};
```

## Current Implementation

See `components/EsriMap.tsx` lines 171-191 for current basemap implementation.

## Notes

- The deprecation warning does not affect functionality
- Basemaps load correctly and work as expected
- Migration can be done when esri-leaflet adds full Vector module support
- For now, the current implementation is production-ready

