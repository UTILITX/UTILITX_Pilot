export async function addFeatureToLayer(
    layerUrl: string,
    geometry: any,
    attributes: Record<string, any> = {}
  ) {
    const formBody = new URLSearchParams();
    formBody.append("f", "json");
    formBody.append("token", process.env.NEXT_PUBLIC_ARCGIS_API_KEY!);
    formBody.append("features", JSON.stringify([{ geometry, attributes }]));
  
    const response = await fetch(`${layerUrl}/addFeatures`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });
  
    const data = await response.json();
    if (data.addResults?.[0]?.success) {
      console.log("✅ Feature added successfully:", data.addResults[0]);
      return data.addResults[0];
    } else {
        if (!data.addResults?.[0]?.success) {
            console.error("❌ Add feature failed. Full error below:");
            console.error(JSON.stringify(data, null, 2));  // Pretty-print the whole object
            throw new Error("Failed to add feature");
          }
          
      console.error("🔍 Full error response:", JSON.stringify(data, null, 2));
      throw new Error("Failed to add feature");
    }
  }
  