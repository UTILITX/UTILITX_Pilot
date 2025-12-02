"use client";

import type { LatLng } from "leaflet";
import {
  WORK_AREAS_LAYER_URL,
  WORK_AREAS_SERVER_URL,
  ARCGIS_PORTAL_URL,
} from "./config";

export type SaveWorkAreaOptions = {
  geometry: any; // ArcGIS Polygon - imported dynamically
  attributes: Record<string, any>;
  layerUrl?: string; // Optional override for target layer (defaults to WORK_AREAS_LAYER_URL)
};

export type UpdateWorkAreaAttributesOptions = {
  objectId: number | string;
  attributes: Record<string, any>;
  layerUrl?: string;
};

type WorkAreaEdit = {
  geometry?: any;
  attributes: Record<string, any>;
};

type ApplyWorkAreaEditsOptions = {
  layerUrl?: string;
  adds?: WorkAreaEdit[];
  updates?: WorkAreaEdit[];
};

// Backward compatibility: accept (workAreaUrl, polygon) signature
export async function saveWorkArea(
  workAreaUrlOrOptions: string | SaveWorkAreaOptions,
  polygon?: LatLng[]
): Promise<any> {
  if (typeof window === "undefined") {
    throw new Error("saveWorkArea can only be called in the browser");
  }

  if (typeof workAreaUrlOrOptions === "string" && polygon) {
    const rings = [polygon.map((p) => [p.lng, p.lat])];
    const PolygonClass = (await import("@arcgis/core/geometry/Polygon")).default;
    const geometry = new PolygonClass({
      rings,
      spatialReference: { wkid: 4326 },
    });
    const attributes = {
      created_at: new Date().toISOString(),
    };

    return applyWorkAreaEdits({
      layerUrl: workAreaUrlOrOptions,
      adds: [
        {
          geometry,
          attributes,
        },
      ],
    });
  }

  if (typeof workAreaUrlOrOptions === "object" && workAreaUrlOrOptions.geometry) {
    return applyWorkAreaEdits({
      layerUrl: workAreaUrlOrOptions.layerUrl,
      adds: [
        {
          geometry: workAreaUrlOrOptions.geometry,
          attributes: workAreaUrlOrOptions.attributes,
        },
      ],
    });
  }

  throw new Error("Invalid arguments to saveWorkArea");
}

export async function updateWorkAreaAttributes({
  objectId,
  attributes,
  layerUrl,
}: UpdateWorkAreaAttributesOptions): Promise<any> {
  if (!objectId) {
    throw new Error("objectId is required when updating work area attributes");
  }

  const normalizedObjectId = Number(objectId);
  if (Number.isNaN(normalizedObjectId)) {
    throw new Error("Invalid objectId provided");
  }

  return applyWorkAreaEdits({
    layerUrl,
    updates: [
      {
        attributes: {
          ...attributes,
          OBJECTID: normalizedObjectId,
        },
      },
    ],
  });
}

async function applyWorkAreaEdits({
  layerUrl,
  adds = [],
  updates = [],
}: ApplyWorkAreaEditsOptions) {
  const hasAdds = Array.isArray(adds) && adds.length > 0;
  const hasUpdates = Array.isArray(updates) && updates.length > 0;

  if (!hasAdds && !hasUpdates) {
    throw new Error("At least one add or update edit is required for work area edits");
  }

  const esriId = (await import("@arcgis/core/identity/IdentityManager")).default;

  let token: string | null = null;
  let username: string | null = null;
  try {
    const { getArcGISToken, getArcGISUsername } = await import("@/lib/auth/get-token");
    token = getArcGISToken();
    username = getArcGISUsername();
    console.log("✅ [saveWorkArea] Got OAuth token from client-side auth");
  } catch (err) {
    console.error("❌ [saveWorkArea] Failed to get token from API:", err);
    throw new Error("Authentication required. Please log in.");
  }

  if (!token) {
    console.error("❌ [saveWorkArea] No token available");
    throw new Error("No authentication token available. Please log in.");
  }

  console.log("🔍 [saveWorkArea] Saving OAuth infos for later restoration...");
  let savedOAuthInfos: any[] = [];
  try {
    if (esriId.oAuthInfos && esriId.oAuthInfos.length > 0) {
      savedOAuthInfos = [...esriId.oAuthInfos];
      console.log("🔍 [saveWorkArea] Found", savedOAuthInfos.length, "registered OAuth infos");
    }
  } catch (e) {
    console.warn("[saveWorkArea] Could not access OAuth infos:", e);
  }

  console.log("🔍 [saveWorkArea] Clearing old IdentityManager credentials...");
  try {
    esriId.destroyCredentials();

    if (typeof window !== "undefined") {
      try {
        if (window.localStorage) {
          const localStorageKeys = Object.keys(localStorage);
          localStorageKeys.forEach((key) => {
            if (
              key.toLowerCase().includes("arcgis") ||
              key.toLowerCase().includes("credential") ||
              key.toLowerCase().includes("esri") ||
              key.toLowerCase().includes("oauth")
            ) {
              console.log("🔍 [saveWorkArea] Clearing localStorage credential:", key);
              localStorage.removeItem(key);
            }
          });
        }

        if (window.sessionStorage) {
          const sessionStorageKeys = Object.keys(sessionStorage);
          sessionStorageKeys.forEach((key) => {
            if (
              key.toLowerCase().includes("arcgis") ||
              key.toLowerCase().includes("credential") ||
              key.toLowerCase().includes("esri") ||
              key.toLowerCase().includes("oauth")
            ) {
              console.log("🔍 [saveWorkArea] Clearing sessionStorage credential:", key);
              sessionStorage.removeItem(key);
            }
          });
        }
      } catch (e) {
        console.warn("[saveWorkArea] Error clearing browser storage:", e);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("✅ [saveWorkArea] Cleared old credentials");
  } catch (err) {
    console.warn("[saveWorkArea] Error clearing credentials (might be empty):", err);
  }

  try {
    if (WORK_AREAS_SERVER_URL && ARCGIS_PORTAL_URL) {
      esriId.registerServers([
        {
          server: WORK_AREAS_SERVER_URL.trim(),
          tokenServiceUrl: `${ARCGIS_PORTAL_URL}/sharing/oauth2/token`,
        },
      ]);

      esriId.registerToken({
        server: ARCGIS_PORTAL_URL,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
      });

      esriId.registerToken({
        server: WORK_AREAS_SERVER_URL.trim(),
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
        ssl: false,
      });

      const exactLayerUrl = WORK_AREAS_LAYER_URL.substring(0, WORK_AREAS_LAYER_URL.lastIndexOf("/"));
      esriId.registerToken({
        server: exactLayerUrl,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
        ssl: false,
      });

      const sharingRestUrl = `${ARCGIS_PORTAL_URL}/sharing/rest`;
      esriId.registerToken({
        server: sharingRestUrl,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
      });

      const layerServerUrl = WORK_AREAS_LAYER_URL.substring(0, WORK_AREAS_LAYER_URL.indexOf("/FeatureServer"));
      if (layerServerUrl) {
        esriId.registerToken({
          server: layerServerUrl,
          token: token,
          userId: username || "user",
          expires: Date.now() + 7200000,
        });
      }

      esriId.registerToken({
        server: WORK_AREAS_LAYER_URL,
        token: token,
        userId: username || "user",
        expires: Date.now() + 7200000,
      });

      const featureServerBaseUrl = WORK_AREAS_LAYER_URL.substring(0, WORK_AREAS_LAYER_URL.lastIndexOf("/"));
      if (featureServerBaseUrl && featureServerBaseUrl !== layerServerUrl) {
        esriId.registerToken({
          server: featureServerBaseUrl,
          token: token,
          userId: username || "user",
          expires: Date.now() + 7200000,
        });
      }

      console.log("✅ [saveWorkArea] Token registered with IdentityManager");
      console.log("🔍 [saveWorkArea] Registered servers:", {
        portal: ARCGIS_PORTAL_URL,
        server: WORK_AREAS_SERVER_URL.trim(),
        sharingRest: sharingRestUrl,
        layerServer: layerServerUrl || "N/A",
        exactLayerUrl: WORK_AREAS_LAYER_URL,
        featureServerBase: featureServerBaseUrl || "N/A",
      });
    } else {
      console.warn(
        "[saveWorkArea] WORK_AREAS_SERVER_URL or ARCGIS_PORTAL_URL missing; skipping registerServers."
      );
    }
  } catch (err) {
    console.error("[saveWorkArea] registerServers/registerToken failed:", err);
  }

  const serializedAdds = adds
    .map((edit) => {
      if (!edit.geometry) {
        console.warn("⚠️ Skipping add edit missing geometry:", edit);
        return null;
      }
      return {
        geometry: serializeGeometry(edit.geometry),
        attributes: edit.attributes,
      };
    })
    .filter(Boolean);

  const serializedUpdates = updates.map((edit) => {
    const payload: Record<string, any> = {
      attributes: edit.attributes,
    };
    if (edit.geometry) {
      payload.geometry = serializeGeometry(edit.geometry);
    }
    return payload;
  });

  if (!serializedAdds.length && !serializedUpdates.length) {
    throw new Error("No valid edits were supplied to applyEdits");
  }

  console.log("🔍 [saveWorkArea] Preparing REST API call with edits", {
    adds: serializedAdds.length,
    updates: serializedUpdates.length,
  });

  const targetLayerUrl = (layerUrl || WORK_AREAS_LAYER_URL).trim().replace(/\/+$/, "");
  const applyEditsUrl = `${targetLayerUrl}/applyEdits`;

  const params = new URLSearchParams({
    f: "json",
    token: token || "",
  });
  if (serializedAdds.length) {
    params.append("adds", JSON.stringify(serializedAdds));
  }
  if (serializedUpdates.length) {
    params.append("updates", JSON.stringify(serializedUpdates));
  }

  console.log("🔍 [saveWorkArea] Calling applyEdits at:", applyEditsUrl);
  console.log(
    "🔍 [saveWorkArea] Token in request:",
    token ? `${token.substring(0, 30)}...` : "null"
  );

  try {
    const response = await fetch(applyEditsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await response.json();
    console.log("✅ [saveWorkArea] applyEdits response:", result);

    if (result.error) {
      console.error("❌ [saveWorkArea] Direct REST API error:", result.error);
      const details = Array.isArray(result.error.details) ? result.error.details.join(" | ") : "";
      throw new Error(
        `ArcGIS applyEdits failed: ${result.error.message || "Unknown error"} (code ${
          result.error.code || "unknown"
        })${details ? ` – ${details}` : ""}`
      );
    }

    if (serializedAdds.length) {
      const addResult = result.addResults?.[0];
      if (addResult?.error) {
        console.error("❌ [saveWorkArea] addResults error:", addResult.error);
        const details = Array.isArray(addResult.error.details) ? addResult.error.details.join(" | ") : "";
        throw new Error(
          `ArcGIS applyEdits failed: ${addResult.error.message} (code ${addResult.error.code})${
            details ? ` – ${details}` : ""
          }`
        );
      }
      console.log("✅ [saveWorkArea] Successfully added work area:", addResult?.objectId);
    }

    if (serializedUpdates.length) {
      const updateResult = result.updateResults?.[0];
      if (updateResult?.error) {
        console.error("❌ [saveWorkArea] updateResults error:", updateResult.error);
        const details = Array.isArray(updateResult.error.details) ? updateResult.error.details.join(" | ") : "";
        throw new Error(
          `ArcGIS applyEdits failed: ${updateResult.error.message} (code ${updateResult.error.code})${
            details ? ` – ${details}` : ""
          }`
        );
      }
      console.log("✅ [saveWorkArea] Successfully updated work area:", updateResult?.objectId);
    }

    return result;
  } catch (fetchError: any) {
    console.error("❌ [saveWorkArea] applyEdits call failed:", fetchError);
    throw fetchError;
  } finally {
    if (savedOAuthInfos.length > 0) {
      try {
        console.log("🔍 [saveWorkArea] Restoring OAuth infos...");
        if (esriId.oAuthInfos) {
          savedOAuthInfos.forEach((info) => {
            if (
              !esriId.oAuthInfos.some(
                (existing: any) => existing.appId === info.appId && existing.portalUrl === info.portalUrl
              )
            ) {
              esriId.oAuthInfos.push(info);
            }
          });
        }
      } catch (e) {
        console.warn("[saveWorkArea] Could not restore OAuth infos:", e);
      }
    }
  }
}

function serializeGeometry(value: any): any {
  if (!value) return value;
  if (typeof value.toJSON === "function") {
    return value.toJSON();
  }
  if (value.rings) {
    return {
      rings: value.rings,
      spatialReference: value.spatialReference || { wkid: 4326 },
    };
  }
  if (value.paths) {
    return {
      paths: value.paths,
      spatialReference: value.spatialReference || { wkid: 4326 },
    };
  }
  return value;
}

