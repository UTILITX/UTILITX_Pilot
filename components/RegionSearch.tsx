"use client";

import { useState, useEffect, useRef } from "react";
import { suggestRegions, geocodeMagicKey } from "@/lib/esriGeocoder";
import L from "leaflet";
import { useMap } from "@/contexts/MapContext";

type RegionSearchProps = {
  map?: L.Map | null;
};

export default function RegionSearch({ map: mapProp }: RegionSearchProps) {
  const { map: mapFromContext } = useMap();
  const map = mapProp || mapFromContext;
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingZoom, setPendingZoom] = useState<{ bounds?: any[][]; location?: { lat: number; lng: number } } | null>(null);
  const pendingBoundsRef = useRef<L.LatLngBoundsExpression | null>(null);
  const pendingLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply pending zoom when map becomes available (using refs for reliability)
  useEffect(() => {
    if (!map) return;
    
    console.log("✅ Map now available in RegionSearch, checking for pending zoom");
    
    // Check refs first (most reliable)
    if (pendingBoundsRef.current) {
      console.log("🎉 Map ready: applying pending bounds from ref");
      map.invalidateSize();
      setTimeout(() => {
        try {
          const bounds = pendingBoundsRef.current instanceof L.LatLngBounds
            ? pendingBoundsRef.current
            : L.latLngBounds(pendingBoundsRef.current as any);
          console.log("🎯 Fitting bounds (from ref):", bounds);
          map.fitBounds(bounds, {
            padding: [100, 100],
            animate: true,
            duration: 1.0,
            maxZoom: 15,
          });
          pendingBoundsRef.current = null;
        } catch (e) {
          console.error("❌ Error fitting bounds from ref:", e);
          pendingBoundsRef.current = null;
        }
      }, 50);
      return;
    }
    
    if (pendingLocationRef.current) {
      console.log("🎉 Map ready: applying pending location from ref");
      map.invalidateSize();
      setTimeout(() => {
        try {
          const { lat, lng } = pendingLocationRef.current!;
          console.log("📍 Setting view to location (from ref):", { lat, lng });
          map.setView([lat, lng], 11, { animate: true });
          pendingLocationRef.current = null;
        } catch (e) {
          console.error("❌ Error setting view from ref:", e);
          pendingLocationRef.current = null;
        }
      }, 50);
      return;
    }
    
    // Fallback: check state (for backwards compatibility)
    if (pendingZoom) {
      console.log("✅ Map now available, performing pending zoom from state:", pendingZoom);
      map.invalidateSize();
      
      setTimeout(() => {
        if (pendingZoom.bounds) {
          const [[south, west], [north, east]] = pendingZoom.bounds;
          if (typeof south === 'number' && typeof west === 'number' && 
              typeof north === 'number' && typeof east === 'number' &&
              south !== north && west !== east) {
            try {
              const bounds = L.latLngBounds(
                [south, west],
                [north, east]
              );
              console.log("🎯 Fitting bounds (from state):", bounds);
              map.fitBounds(bounds, {
                padding: [100, 100],
                animate: true,
                duration: 1.0,
                maxZoom: 15,
              });
            } catch (e) {
              console.error("❌ Error fitting bounds from state:", e);
            }
          }
        } else if (pendingZoom.location) {
          try {
            console.log("📍 Setting view to location (from state):", pendingZoom.location);
            map.setView([pendingZoom.location.lat, pendingZoom.location.lng], 11, { animate: true });
          } catch (e) {
            console.error("❌ Error setting view from state:", e);
          }
        }
        
        setPendingZoom(null);
      }, 100);
    }
  }, [map, pendingZoom]);

  // Restore saved region on mount and when map becomes available
  useEffect(() => {
    // Only run once on mount or when map first becomes available
    if (map && query === "") {
      try {
        const saved = localStorage.getItem("selectedRegion");
        if (!saved) return;

        console.log("🌍 Restoring saved region from localStorage:", saved);
        setQuery(saved);

        // Auto-geocode the saved region and zoom to it
        (async () => {
          try {
            setIsLoading(true);
            const suggestions = await suggestRegions(saved);
            if (!suggestions.length) {
              console.warn("⚠️ No suggestions found for saved region:", saved);
              setIsLoading(false);
              return;
            }

            // Use the first suggestion (most relevant match)
            const magicKey = suggestions[0].magicKey;
            const result = await geocodeMagicKey(magicKey);

            if (result?.bounds) {
              const [[south, west], [north, east]] = result.bounds;
              
              // Validate bounds
              if (typeof south === 'number' && typeof west === 'number' && 
                  typeof north === 'number' && typeof east === 'number' &&
                  south !== north && west !== east) {
                
                const bounds = L.latLngBounds(
                  [south, west],
                  [north, east]
                );
                
                // Store in refs for reliable zoom
                pendingBoundsRef.current = bounds;
                setPendingZoom({ bounds: result.bounds });
                
                // Zoom immediately since map is ready
                map.invalidateSize();
                setTimeout(() => {
                  try {
                    console.log("🎯 Auto-zooming to saved region:", saved);
                    map.fitBounds(bounds, {
                      padding: [100, 100],
                      animate: true,
                      duration: 1.0,
                      maxZoom: 15,
                    });
                    pendingBoundsRef.current = null;
                    setPendingZoom(null);
                  } catch (e) {
                    console.error("❌ Error auto-zooming to saved region:", e);
                    pendingBoundsRef.current = null;
                    setPendingZoom(null);
                  }
                }, 100);
              }
            } else if (result?.location) {
              const { location } = result;
              if (location.lat && location.lng) {
                pendingLocationRef.current = { lat: location.lat, lng: location.lng };
                setPendingZoom({ location });
                
                map.invalidateSize();
                setTimeout(() => {
                  map.setView([location.lat, location.lng], 11, { animate: true });
                  pendingLocationRef.current = null;
                  setPendingZoom(null);
                }, 100);
              }
            }
            
            setIsLoading(false);
          } catch (error) {
            console.error("❌ Error restoring saved region:", error);
            setIsLoading(false);
          }
        })();
      } catch (e) {
        console.warn("⚠️ Could not read from localStorage:", e);
      }
    }
  }, [map]); // Only run when map becomes available

  // Fetch suggestions as user types
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const delay = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await suggestRegions(query);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, 250); // avoid API spam

    return () => clearTimeout(delay);
  }, [query]);

  // Handle selecting a suggestion
  const handleSelect = async (magicKey: string, text: string) => {
    setQuery(text);
    setSuggestions([]);
    setIsOpen(false);
    setIsLoading(true);

    console.log("🔍 RegionSearch: handleSelect called", { text, magicKey });
    console.log("🗺️ MAP in RegionSearch:", map ? "✅ Available" : "❌ NULL/UNDEFINED");

    // 🔥 Save selected region to localStorage for persistence
    try {
      localStorage.setItem("selectedRegion", text);
      console.log("💾 Saved region to localStorage:", text);
    } catch (e) {
      console.warn("⚠️ Could not save to localStorage:", e);
    }

    try {
      const result = await geocodeMagicKey(magicKey);
      console.log("📍 Geocoding result:", result);
      console.log("📦 Selected:", text, "Bounds:", result?.bounds);
      
      if (result?.bounds) {
        const [[south, west], [north, east]] = result.bounds;
        console.log("📐 Bounds values:", { south, west, north, east });
        
        // Validate bounds
        if (typeof south === 'number' && typeof west === 'number' && 
            typeof north === 'number' && typeof east === 'number' &&
            south !== north && west !== east) {
          
          const bounds = L.latLngBounds(
            [south, west],
            [north, east]
          );
          
          // Store in both ref (for reliability) and state (for backwards compatibility)
          pendingBoundsRef.current = bounds;
          setPendingZoom({ bounds: result.bounds });
          
          // If map is already available, zoom immediately
          if (map && typeof map.fitBounds === 'function') {
            console.log("✅ Map is ready, zooming immediately");
            
            // Force Leaflet to recalculate size (fixes 80% of fitBounds issues)
            map.invalidateSize();
            
            setTimeout(() => {
              try {
                console.log("🎯 Fitting bounds:", bounds);
                map.fitBounds(bounds, {
                  padding: [100, 100],
                  animate: true,
                  duration: 1.0,
                  maxZoom: 15,
                });
                pendingBoundsRef.current = null;
                setPendingZoom(null);
              } catch (e) {
                console.error("❌ Error fitting bounds:", e);
                pendingBoundsRef.current = null;
                setPendingZoom(null);
              }
            }, 50);
          } else {
            console.log("⏳ Map not ready, will zoom when map becomes available");
          }
        } else {
          console.warn("⚠️ Invalid bounds format:", result.bounds);
          setIsLoading(false);
        }
      } else if (result?.location) {
        console.log("📍 Using location point (no bounds):", result.location);
        const { location } = result;
        
        // Store in both ref and state
        if (location.lat && location.lng) {
          pendingLocationRef.current = { lat: location.lat, lng: location.lng };
          setPendingZoom({ location });
          
          // If map is already available, zoom immediately
          if (map && typeof map.setView === 'function') {
            console.log("✅ Map is ready, setting view to location");
            map.invalidateSize();
            setTimeout(() => {
              map.setView([location.lat, location.lng], 11, { animate: true });
              pendingLocationRef.current = null;
              setPendingZoom(null);
            }, 50);
          } else {
            console.log("⏳ Map not ready, will zoom when map becomes available");
          }
        }
      } else {
        console.warn("❌ No bounds or location in result:", result);
        setIsLoading(false);
        pendingBoundsRef.current = null;
        pendingLocationRef.current = null;
        setPendingZoom(null);
        return;
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("❌ Error geocoding magic key:", error);
      setIsLoading(false);
      setPendingZoom(null);
    }
  };

  return (
    <div className="absolute top-4 left-[480px] z-[1000] pointer-events-auto">
      <div className="relative w-80" ref={containerRef}>
      <input
        type="text"
        value={query}
        placeholder="Search region…"
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        className="w-full px-4 py-2.5 rounded-xl border border-white/40 bg-white/20 backdrop-blur-xl shadow-lg focus:ring-2 focus:ring-white/50 focus:border-white/60 text-sm text-gray-900 placeholder:text-gray-600"
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          …
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute mt-2 w-full bg-white/20 backdrop-blur-xl border border-white/40 rounded-xl shadow-xl z-[1001] max-h-48 overflow-auto">
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className="px-4 py-2.5 hover:bg-white/30 transition-colors cursor-pointer text-sm text-gray-900 first:rounded-t-xl last:rounded-b-xl"
              onClick={() => handleSelect(s.magicKey, s.text)}
            >
              {s.text}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

