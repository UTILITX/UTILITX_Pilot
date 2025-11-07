export async function addFeatureToLayer(
    layerUrl: string,
    geometry: any,
    attributes: Record<string, any> = {}
  ) {
    const params = new URLSearchParams({
      f: "json",
      token: process.env.NEXT_PUBLIC_ARCGIS_API_KEY!,
      features: JSON.stringify([{ geometry, attributes }]),
    });
  
    const response = await fetch(`${layerUrl}/addFeatures`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
  
    const data = await response.json();
    if (data.addResults?.[0]?.success) {
      console.log("✅ Feature added successfully:", data.addResults[0]);
      return data.addResults[0];
    } else {
      console.error("❌ Add feature failed:", data);
      throw new Error("Failed to add feature");
    }
  }
  