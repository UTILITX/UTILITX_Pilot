export async function queryEsriLayer(layerUrl: string) {
  // Prevent SSR
  if (typeof window === "undefined") {
    return [];
  }

  // Dynamic import
  const EL = await import("esri-leaflet");

  return new Promise<any[]>((resolve, reject) => {
    const layer = EL.featureLayer({
      url: layerUrl,
      apikey: process.env.NEXT_PUBLIC_ARCGIS_API_KEY, // 🔥 REQUIRED
    });

    layer.query().run((error, featureCollection) => {
      if (error) {
        console.error("❌ Esri query failed:", error);
        reject(error);
      } else {
        resolve(featureCollection.features ?? []);
      }
    });
  });
}
