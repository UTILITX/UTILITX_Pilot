"use client";

import type { UtilityType, RecordType } from "@/components/dual-record-selector";
import type { GeometryType } from "@/lib/types";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: string;
};

export const utilityTypeOptions: Option<UtilityType>[] = [
  { value: "water", label: "Water" },
  { value: "wastewater", label: "Wastewater" },
  { value: "storm", label: "Storm" },
  { value: "gas", label: "Gas" },
  { value: "telecom", label: "Telecom" },
  { value: "electric", label: "Electric" },
];

export const recordTypeOptions: Option<RecordType>[] = [
  { value: "as built", label: "As Built" },
  { value: "permit", label: "Permit" },
  { value: "locate", label: "Locate" },
  { value: "other", label: "Other" },
];

export const geometryTypeOptions: Option<GeometryType>[] = [
  { value: "point", label: "Point", icon: "●" },
  { value: "line", label: "Line", icon: "━" },
  { value: "polygon", label: "Polygon", icon: "▢" },
];

