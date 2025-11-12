// lib/apwaColors.ts

// Standard APWA color mapping by utility type

export const APWA_COLORS: Record<string, string> = {
  Water: "#0070ff",          // Blue
  Wastewater: "#800080",     // Purple
  Storm: "#00ffff",          // Aqua / Cyan
  Gas: "#ffff00",            // Yellow
  Telecom: "#ff9900",        // Orange
  Electric: "#ff0000",        // Red
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

