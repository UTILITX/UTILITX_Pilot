/**
 * Converts GeoJSON geometry to ArcGIS JSON format
 * Leaflet uses GeoJSON, but ArcGIS REST API expects ArcGIS JSON format
 */
function geoJSONToArcGIS(geoJSONGeometry: any): any {
  if (!geoJSONGeometry || !geoJSONGeometry.type) {
    throw new Error("Invalid GeoJSON geometry");
  }

  const spatialReference = { wkid: 4326 }; // WGS84

  switch (geoJSONGeometry.type) {
    case "Point": {
      // GeoJSON: [lng, lat]
      // ArcGIS: { x: lng, y: lat, spatialReference }
      const [lng, lat] = geoJSONGeometry.coordinates;
      return {
        x: lng,
        y: lat,
        spatialReference,
      };
    }

    case "LineString": {
      // GeoJSON: [[lng, lat], [lng, lat], ...]
      // ArcGIS: { paths: [[[lng, lat], [lng, lat], ...]], spatialReference }
      const path = geoJSONGeometry.coordinates.map(([lng, lat]: [number, number]) => [lng, lat]);
      return {
        paths: [path],
        spatialReference,
      };
    }

    case "Polygon": {
      // GeoJSON: [[[lng, lat], [lng, lat], ...]] (first ring is exterior, rest are holes)
      // ArcGIS: { rings: [[[lng, lat], [lng, lat], ...]], spatialReference }
      const rings = geoJSONGeometry.coordinates.map((ring: number[][]) =>
        ring.map(([lng, lat]: [number, number]) => [lng, lat])
      );
      return {
        rings,
        spatialReference,
      };
    }

    default:
      throw new Error(`Unsupported geometry type: ${geoJSONGeometry.type}`);
  }
}

export async function addFeatureToLayer(
    layerUrl: string,
    geometry: any,
    attributes: Record<string, any> = {}
  ) {
    // Ensure layerUrl doesn't have trailing slash and ends with correct path
    const cleanUrl = layerUrl.replace(/\/$/, "");
    const apiUrl = cleanUrl.endsWith("/addFeatures") 
      ? cleanUrl 
      : `${cleanUrl}/addFeatures`;
    
    // Convert GeoJSON geometry to ArcGIS JSON format
    const arcgisGeometry = geoJSONToArcGIS(geometry);
    
    // Create feature in ArcGIS format
    const feature = {
      geometry: arcgisGeometry,
      attributes,
    };

    const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY!;
    
    // Build request body according to ArcGIS REST API documentation
    const formBody = new URLSearchParams();
    formBody.append("f", "json");
    formBody.append("features", JSON.stringify([feature]));
    
    // Add token to URL as query parameter (some ArcGIS services prefer this)
    const urlWithToken = `${apiUrl}?token=${encodeURIComponent(apiKey)}`;

    // Log request details for debugging (without exposing token)
    console.log("📤 Adding feature to layer:", cleanUrl);
    console.log("📤 Feature geometry type:", geometry.type);
    console.log("📤 ArcGIS geometry format:", JSON.stringify(arcgisGeometry, null, 2));
    
    const response = await fetch(urlWithToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });
  
    if (!response.ok) {
      console.error("❌ HTTP Error:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("❌ Error response:", errorText);
    }
  
    const data = await response.json();
    if (data.addResults?.[0]?.success) {
      console.log("✅ Feature added successfully:", data.addResults[0]);
      return data.addResults[0];
    } else {
      if (!data.addResults?.[0]?.success) {
        console.error("❌ Add feature failed. Full error below:");
        console.error(JSON.stringify(data, null, 2));  // Pretty-print the whole object
        
        // Create a more descriptive error message
        let errorMessage = "Failed to add feature";
        if (data.error) {
          if (data.error.code === 403) {
            errorMessage = "Permission denied. The layer may need:\n" +
              "1. Editing enabled in ArcGIS Online layer settings\n" +
              "2. Public Data Collection enabled, OR\n" +
              "3. API key associated with a user account that has edit permissions\n\n" +
              "Check the layer settings in ArcGIS Online and ensure editing is enabled.";
          } else if (data.error.code === 401) {
            errorMessage = "Authentication failed. Please check your ArcGIS API key is valid.";
          } else if (data.error.message) {
            errorMessage = data.error.message;
          }
        }
        
        const error = new Error(errorMessage);
        (error as any).code = data.error?.code;
        (error as any).details = data.error?.details;
        throw error;
      }
          
      console.error("🔍 Full error response:", JSON.stringify(data, null, 2));
      throw new Error("Failed to add feature");
    }
  }
  