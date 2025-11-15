// lib/completeness.ts

export type CompletenessRecord = {
  utility_type?: string | null;
  utilityType?: string | null;
  record_type?: string | null;
  recordType?: string | null;
  [key: string]: any;
};

export type CompletenessInput = {
  records: CompletenessRecord[];
};

export type CompletenessOutput = {
  completenessPct: number;
  recordCount: number;
  utilitiesPresent: string[];
  utilitiesMissing: string[];
  recordsByType: Record<string, number>;
  gaps: string[];
};

const TARGET_UTILITIES = [
  "Water",
  "Gas",
  "Electric",
  "Telecom",
  "Storm",
  "Wastewater",
];

// Normalize utility type names to match TARGET_UTILITIES
function normalizeUtilityType(utilityType: string | null | undefined): string | null {
  if (!utilityType) return null;
  
  const normalized = utilityType.trim();
  const lower = normalized.toLowerCase();
  
  // Map various formats to standard names
  if (lower.includes("water") && !lower.includes("waste")) return "Water";
  if (lower.includes("wastewater") || lower.includes("sanitary") || lower.includes("sewer")) return "Wastewater";
  if (lower.includes("storm") || lower.includes("stormwater")) return "Storm";
  if (lower.includes("gas") || lower.includes("natural gas")) return "Gas";
  if (lower.includes("electric") || lower.includes("power") || lower.includes("hydro")) return "Electric";
  if (lower.includes("telecom") || lower.includes("telco") || lower.includes("comm")) return "Telecom";
  
  // Try exact match
  if (TARGET_UTILITIES.includes(normalized)) return normalized;
  
  return null;
}

// Normalize record type names
function normalizeRecordType(recordType: string | null | undefined): string {
  if (!recordType) return "Other";
  
  const normalized = recordType.trim();
  const lower = normalized.toLowerCase();
  
  if (lower.includes("asbuilt") || lower.includes("as-built") || lower.includes("as built")) return "AsBuilt";
  if (lower.includes("locate")) return "Locate";
  if (lower.includes("permit")) return "Permit";
  if (lower.includes("pdf") || lower.includes("document")) return "PDF";
  
  return normalized; // Return as-is if no match
}

export function computeWorkAreaCompleteness(
  input: CompletenessInput
): CompletenessOutput {
  const { records } = input;
  const recordCount = records.length;

  const utilitiesPresentSet = new Set<string>();
  const recordsByType: Record<string, number> = {};

  records.forEach((r) => {
    // Support both utility_type and utilityType (from different sources)
    const utilityType = normalizeUtilityType(r.utility_type || r.utilityType);
    const recordType = normalizeRecordType(r.record_type || r.recordType);

    if (utilityType) {
      utilitiesPresentSet.add(utilityType);
    }

    if (recordType) {
      recordsByType[recordType] = (recordsByType[recordType] || 0) + 1;
    }
  });

  const utilitiesPresent = Array.from(utilitiesPresentSet);
  const utilitiesMissing = TARGET_UTILITIES.filter(
    (u) => !utilitiesPresentSet.has(u)
  );

  // Utility coverage: 0–100 based on how many target utilities have at least 1 record
  const utilityCoverageScore =
    (utilitiesPresent.length / TARGET_UTILITIES.length) * 100;

  // Record density: simple heuristic – 0–100 based on log of record count
  const recordDensityScore = Math.min(100, Math.log(recordCount + 1) * 35);

  // Blend 50/50
  const blended = Math.round(
    0.5 * utilityCoverageScore + 0.5 * recordDensityScore
  );

  const completenessPct = Math.max(0, Math.min(100, blended));

  // Gaps
  const gaps: string[] = [];

  if (utilitiesMissing.length) {
    gaps.push(`No records for: ${utilitiesMissing.join(", ")}`);
  }

  if (recordCount === 0) {
    gaps.push("No records found in this work area.");
  } else if (recordCount < 3) {
    gaps.push("Very few records found in this work area.");
  }

  // No As-Built logic (based on record_type)
  const hasAsBuilt = Object.keys(recordsByType).some((t) => {
    const lower = t.toLowerCase();
    return lower.includes("as built") || lower.includes("as-built") || lower.includes("asbuilt");
  });
  if (!hasAsBuilt && recordCount > 0) {
    gaps.push("No As-Built drawings found.");
  }

  return {
    completenessPct,
    recordCount,
    utilitiesPresent,
    utilitiesMissing,
    recordsByType,
    gaps,
  };
}

