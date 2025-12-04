"use client";

import { getArcGISToken } from "@/lib/auth/get-token";

type UpdateArcGISFeatureParams = {
  layerUrl: string;
  objectId: number;
  attributes: Record<string, any>;
};

export async function updateArcGISFeature({
  layerUrl,
  objectId,
  attributes,
}: UpdateArcGISFeatureParams) {
  if (typeof window === "undefined") {
    throw new Error("updateArcGISFeature can only run in the browser");
  }

  if (!layerUrl) {
    throw new Error("Layer URL is required to update an ArcGIS feature");
  }

  const token = getArcGISToken();
  if (!token) {
    throw new Error("You must be signed in to update records");
  }

  const normalizedObjectId = Number(objectId);
  if (!Number.isFinite(normalizedObjectId)) {
    throw new Error("Invalid object ID provided for ArcGIS update");
  }

  const cleanUrl = layerUrl.replace(/\/$/, "");
  const applyEditsUrl = `${cleanUrl}/applyEdits`;

  const updateAttributes = {
    ...attributes,
    OBJECTID: normalizedObjectId,
    objectid: normalizedObjectId,
  };

  const formData = new FormData();
  formData.append("f", "json");
  formData.append("token", token);
  formData.append(
    "updates",
    JSON.stringify([
      {
        attributes: updateAttributes,
      },
    ]),
  );

  const response = await fetch(applyEditsUrl, {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(
      `ArcGIS applyEdits failed: ${
        result.error.message || "unknown error"
      } (code ${result.error.code ?? "unknown"})`,
    );
  }

  const updateResult = result.updateResults?.[0];
  if (!updateResult?.success) {
    if (updateResult?.error) {
      throw new Error(
        `ArcGIS update failed: ${
          updateResult.error.message || "unknown error"
        } (code ${updateResult.error.code ?? "unknown"})`,
      );
    }
    throw new Error("ArcGIS update did not return a success response");
  }

  return updateResult;
}

