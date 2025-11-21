export async function queryEsriLayer(layerUrl: string, token?: string | null) {
  // Prevent SSR
  if (typeof window === "undefined") {
    return [];
  }

  // Use provided token, or fall back to API key, or try to get from cookies
  let authToken = token;
  if (!authToken) {
    // Try to get token from API route (reads from HTTP-only cookies)
    try {
      const tokenResponse = await fetch("/api/auth/check");
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        if (tokenData.authenticated && tokenData.token) {
          authToken = tokenData.token;
        }
      }
    } catch (error) {
      console.warn("Could not fetch token from API, falling back to API key");
    }
  }
  
  // Fall back to API key if no token
  if (!authToken) {
    authToken = process.env.NEXT_PUBLIC_ARCGIS_API_KEY!;
  }

  const cleanUrl = layerUrl.replace(/\/$/, "");
  
  // Use ArcGIS REST API directly to ensure we get attributes
  const queryUrl = `${cleanUrl}/query`;
  const params = new URLSearchParams({
    f: "json",
    where: "1=1", // Get all features
    outFields: "*", // Get all fields
    returnGeometry: "true",
    token: authToken,
  });

  try {
    const response = await fetch(`${queryUrl}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      console.error("❌ ArcGIS query error:", data.error);
      throw new Error(data.error.message || "Query failed");
    }

    const features = data.features ?? [];
    
    // Log first feature to debug attribute structure
    if (features.length > 0 && process.env.NODE_ENV === "development") {
      const firstFeature = features[0];
      console.log("🔍 First feature from REST API:", {
        hasAttributes: !!firstFeature.attributes,
        hasProperties: !!firstFeature.properties,
        attributeKeys: firstFeature.attributes ? Object.keys(firstFeature.attributes) : [],
        propertyKeys: firstFeature.properties ? Object.keys(firstFeature.properties) : [],
        sampleAttributes: firstFeature.attributes || {},
        fullFeature: firstFeature,
      });
    }

    return features;
  } catch (error) {
    console.error("❌ Failed to query ArcGIS layer:", error);
    throw error;
  }
}
