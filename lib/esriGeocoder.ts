export async function suggestRegions(text: string) {
  if (!text.trim()) return [];

  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest`;

  const params = new URLSearchParams({
    f: "json",
    text,
    maxSuggestions: "5",
  });

  const response = await fetch(`${url}?${params.toString()}`);
  const data = await response.json();

  return data?.suggestions || [];
}

export async function geocodeMagicKey(magicKey: string) {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates`;

  const params = new URLSearchParams({
    f: "json",
    outFields: "Match_addr,Addr_type",
    maxLocations: "1",
    magicKey,
  });

  const response = await fetch(`${url}?${params.toString()}`);
  const data = await response.json();

  console.log("Geocode API response:", data);

  if (!data.candidates?.length) {
    console.warn("No candidates returned from geocode API");
    return null;
  }

  const c = data.candidates[0];
  
  console.log("🔍 Candidate from Esri:", {
    address: c.address,
    hasExtent: !!c.extent,
    hasLocation: !!c.location,
    extent: c.extent,
    location: c.location
  });
  
  // Check if we have extent (bounding box)
  if (c.extent) {
    const extent = c.extent;
    
    // Validate extent values
    if (typeof extent.ymin === 'number' && typeof extent.xmin === 'number' &&
        typeof extent.ymax === 'number' && typeof extent.xmax === 'number' &&
        extent.ymin !== extent.ymax && extent.xmin !== extent.xmax) {
      
      // Esri format: extent.ymin = south, extent.xmin = west, extent.ymax = north, extent.xmax = east
      const bounds = [
        [extent.ymin, extent.xmin], // [south, west]
        [extent.ymax, extent.xmax], // [north, east]
      ];
      
      console.log("✅ Valid bounds created:", bounds);
      return { bounds, address: c.address, location: c.location };
    } else {
      console.warn("⚠️ Invalid extent values:", extent);
    }
  }
  
  // Fallback: if no extent, use location point
  if (c.location && typeof c.location.y === 'number' && typeof c.location.x === 'number') {
    console.log("📍 Using location point (no valid extent)");
    return { 
      location: { lat: c.location.y, lng: c.location.x },
      address: c.address 
    };
  }

  console.warn("❌ No valid extent or location in candidate:", c);
  return null;
}

