// lib/apwaColors.ts

// Standard APWA color mapping by utility type

export const APWA_COLORS: Record<string, string> = {
  Water: "#00A3E0",          // Official APWA Blue
  Wastewater: "#742774",     // Official APWA Purple
  Storm: "#3A7D44",          // Official APWA Green
  Gas: "#FEDD00",            // Official APWA Yellow
  Telecom: "#F68D2E",        // Official APWA Orange
  Electric: "#DA291C",       // Official APWA Red
  Default: "#808080"         // Grey fallback
};

/**
 * Returns the APWA color for a given utility type.
 */
export const getApwaColor = (utilityType?: string): string => {
  if (!utilityType) return APWA_COLORS.Default;

  const key = Object.keys(APWA_COLORS).find(
    k => k.toLowerCase() === utilityType.toLowerCase()
  );

  return key ? APWA_COLORS[key] : APWA_COLORS.Default;
};

