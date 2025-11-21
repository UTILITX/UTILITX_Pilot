// lib/arcgis/saveWorkArea.ts
"use client";

import type { LatLng } from "leaflet";
import {
  WORK_AREAS_LAYER_URL,
  WORK_AREAS_SERVER_URL,
  ARCGIS_PORTAL_URL,
} from "./config";

type SaveWorkAreaOptions = {
  geometry: any; // ArcGIS Polygon - imported dynamically
  attributes: Record<string, any>;
};

// Backward compatibility: accept (workAreaUrl, polygon) signature
export async function saveWorkArea(
  workAreaUrlOrOptions: string | SaveWorkAreaOptions,
  polygon?: LatLng[]
): Promise<any> {
  // SSR guard
  if (typeof window === "undefined") {
    throw new Error("saveWorkArea can only be called in the browser");
  }

  // Handle old signature: saveWorkArea(workAreaUrl, polygon)
  if (typeof workAreaUrlOrOptions === "string" && polygon) {
    // Convert LatLng[] to ArcGIS Polygon rings format
    const rings = [polygon.map((p) => [p.lng, p.lat])];
    
    // Dynamically import Polygon to avoid SSR issues
    const PolygonClass = (await import("@arcgis/core/geometry/Polygon")).default;
    
    const geometry = new PolygonClass({
      rings,
      spatialReference: { wkid: 4326 },
    });
    
    const attributes = {
      created_at: new Date().toISOString(),
    };
    
    return saveWorkAreaInternal({ geometry, attributes });
  }

  // Handle new signature: saveWorkArea({ geometry, attributes })
  if (typeof workAreaUrlOrOptions === "object" && workAreaUrlOrOptions.geometry) {
    return saveWorkAreaInternal(workAreaUrlOrOptions);
  }

  throw new Error("Invalid arguments to saveWorkArea");
}

async function saveWorkAreaInternal({ geometry, attributes }: SaveWorkAreaOptions) {
  // Dynamically import ArcGIS modules to avoid SSR issues
  const esriId = (await import("@arcgis/core/identity/IdentityManager")).default;
  const FeatureLayer = (await import("@arcgis/core/layers/FeatureLayer")).default;
  const Graphic = (await import("@arcgis/core/Graphic")).default;

  console.log("🔍 [saveWorkArea] Ensuring server is registered with OAuth");

  try {
    // This is just to help IdentityManager map the FeatureServer → portal token endpoint.
    // If it fails, we still try the edit.
    if (WORK_AREAS_SERVER_URL && ARCGIS_PORTAL_URL) {
      esriId.registerServers([
        {
          server: WORK_AREAS_SERVER_URL.trim(),
          tokenServiceUrl: `${ARCGIS_PORTAL_URL}/sharing/rest/oauth2/token`,
        },
      ]);
    } else {
      console.warn(
        "[saveWorkArea] WORK_AREAS_SERVER_URL or ARCGIS_PORTAL_URL missing; skipping registerServers."
      );
    }
  } catch (err) {
    console.error("[saveWorkArea] registerServers failed (non-fatal):", err);
  }

  const layer = new FeatureLayer({
    url: WORK_AREAS_LAYER_URL,
    outFields: ["*"],
  });

  const graphic = new Graphic({
    geometry,
    attributes,
  });

  console.log("📝 [saveWorkArea] Calling applyEdits on WorkAreas layer...");

  const result = await layer.applyEdits({
    addFeatures: [graphic],
  });

  console.log("✅ [saveWorkArea] applyEdits result:", result);

  const addResult = result.addFeatureResults?.[0];
  if (addResult?.error) {
    throw new Error(
      `ArcGIS applyEdits failed: ${addResult.error.message} (code ${addResult.error.code})`
    );
  }

  return addResult;
}

