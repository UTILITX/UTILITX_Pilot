"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { getSignedUrl } from "@/lib/supabase";

interface RecordsTableProps {
  records: any[];
  onZoomToRecord: (record: any) => void;
  utilityFilter: string;
  setUtilityFilter: (v: string) => void;
  typeFilter: string;
  setTypeFilter: (v: string) => void;
  orgFilter: string;
  setOrgFilter: (v: string) => void;
  geometryFilter: string;
  setGeometryFilter: (v: string) => void;
  hasFileFilter: string;
  setHasFileFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}

export function RecordsTable({
  records,
  onZoomToRecord,
  utilityFilter,
  setUtilityFilter,
  typeFilter,
  setTypeFilter,
  orgFilter,
  setOrgFilter,
  geometryFilter,
  setGeometryFilter,
  hasFileFilter,
  setHasFileFilter,
  searchQuery,
  setSearchQuery,
}: RecordsTableProps) {

  // Create a derived filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Utility filter (case-insensitive, supports both camelCase and snake_case)
      if (utilityFilter && utilityFilter !== "all") {
        const recUtility = (rec.utilityType || rec.utility_type || "").toLowerCase();
        if (recUtility !== utilityFilter.toLowerCase()) {
          return false;
        }
      }

      // Record type filter (case-insensitive, supports both camelCase and snake_case)
      if (typeFilter && typeFilter !== "all") {
        const recType = (rec.recordType || rec.record_type || "").toLowerCase();
        if (recType !== typeFilter.toLowerCase()) {
          return false;
        }
      }

      // Geometry filter
      if (geometryFilter && geometryFilter !== "all") {
        if (rec.geometryType !== geometryFilter) {
          return false;
        }
      }

      // Organization filter (case-insensitive)
      if (orgFilter && orgFilter !== "all") {
        const recOrg = (rec.organization || "").toLowerCase();
        if (recOrg !== orgFilter.toLowerCase()) {
          return false;
        }
      }

      // Has file filter
      const hasFile = !!rec.fileUrl;
      if (hasFileFilter === "yes" && !hasFile) return false;
      if (hasFileFilter === "no" && hasFile) return false;

      // Search filter (text across multiple fields)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = (rec.title || rec.name || rec.fileName || "").toLowerCase();
        const utilityType = (rec.utilityType || rec.utility_type || "").toLowerCase();
        const recordType = (rec.recordType || rec.record_type || "").toLowerCase();
        const organization = (rec.organization || "").toLowerCase();

        if (
          !title.includes(q) &&
          !utilityType.includes(q) &&
          !recordType.includes(q) &&
          !organization.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [records, utilityFilter, typeFilter, geometryFilter, orgFilter, hasFileFilter, searchQuery]);

  // Generate unique lists from records for dynamic filter options
  const uniqueUtilities = useMemo(() => {
    const utilities = records
      .map((r) => r.utilityType || r.utility_type)
      .filter(Boolean)
      .map((u) => String(u).toLowerCase());
    return Array.from(new Set(utilities)).sort();
  }, [records]);

  const uniqueRecordTypes = useMemo(() => {
    const types = records
      .map((r) => r.recordType || r.record_type)
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());
    return Array.from(new Set(types)).sort();
  }, [records]);

  const uniqueOrganizations = useMemo(() => {
    const orgs = records
      .map((r) => r.organization)
      .filter(Boolean)
      .map((o) => String(o).toLowerCase());
    return Array.from(new Set(orgs)).sort();
  }, [records]);

  const uniqueGeometryTypes = useMemo(() => {
    const geometries = records
      .map((r) => r.geometryType || r.geometry?.type)
      .filter(Boolean);
    return Array.from(new Set(geometries)).sort();
  }, [records]);

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  if (!records || records.length === 0) {
    return <p className="text-sm text-gray-500">No records yet.</p>;
  }

  // Helper function to extract file path from fileUrl
  const getFilePath = (record: any): string | null => {
    if (record.filePath) return record.filePath;
    if (record.fileUrl) {
      // If fileUrl contains "Records_Private/", extract the path part
      if (record.fileUrl.includes("Records_Private/")) {
        return record.fileUrl.replace("Records_Private/", "");
      }
      // If it's already a path (not a full URL), return it
      if (!record.fileUrl.startsWith("http")) {
        return record.fileUrl;
      }
    }
    return null;
  };

  // Handler to open file with signed URL
  const handleOpenFile = async (record: any) => {
    const filePath = getFilePath(record);
    if (!filePath) {
      console.warn("No file path available for record:", record);
      return;
    }

    try {
      const signedUrl = await getSignedUrl(filePath, 3600); // 1-hour signed URL
      window.open(signedUrl, "_blank");
    } catch (err: any) {
      console.error("Error opening file:", err);
      alert(`Failed to open file: ${err.message || "Unknown error"}`);
    }
  };

  return (
    <div className="rounded-md border bg-white max-h-[28vh] overflow-y-auto">
      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 border-b">
        {/* Utility Type */}
        <Select onValueChange={setUtilityFilter} value={utilityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Utility Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Utilities</SelectItem>
            {uniqueUtilities.map((u) => (
              <SelectItem key={u} value={u}>
                {capitalizeWords(u)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Record Type */}
        <Select onValueChange={setTypeFilter} value={typeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Record Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueRecordTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {capitalizeWords(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Geometry */}
        <Select onValueChange={setGeometryFilter} value={geometryFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Geometry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {uniqueGeometryTypes.map((g) => (
              <SelectItem key={g} value={g}>
                {g === "LineString" ? "Line" : g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Organization */}
        <Select onValueChange={setOrgFilter} value={orgFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {uniqueOrganizations.map((o) => (
              <SelectItem key={o} value={o}>
                {capitalizeWords(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Has File */}
        <Select onValueChange={setHasFileFilter} value={hasFileFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Has File?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">With File</SelectItem>
            <SelectItem value="no">No File</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <Input
          placeholder="Search..."
          className="w-48"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Clear All Filters */}
        <button
          onClick={() => {
            setUtilityFilter("all");
            setTypeFilter("all");
            setGeometryFilter("all");
            setOrgFilter("all");
            setHasFileFilter("all");
            setSearchQuery("");
          }}
          className="text-xs text-blue-600 underline hover:text-blue-800 ml-4"
        >
          Clear All Filters
        </button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Geometry</TableHead>
            <TableHead>Record</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Utility</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>File</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRecords.map((record) => {
            // Create a truly unique key: use objectId if available, otherwise use id
            // Combine with geometryType to ensure uniqueness across layers
            const uniqueKey = record.objectId 
              ? `${record.geometryType}-${record.objectId}` 
              : record.id || `${record.geometryType}-${record.fileUrl || Date.now()}`;
            
            return (
            <TableRow
              key={uniqueKey}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => onZoomToRecord(record)}
            >
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {record.geometryType || record.geometry?.type || "Point"}
                </Badge>
              </TableCell>

              <TableCell>
                {record.name || record.fileName || 
                 (record.recordType && record.utilityType 
                   ? `${record.utilityType} / ${record.recordType}` 
                   : record.fileUrl 
                     ? `Record ${String(record.id || '').slice(0, 8)}` 
                     : "Record")}
              </TableCell>

              <TableCell>
                <Badge variant="outline">
                  {record.recordType ?? record.record_type ?? "–"}
                </Badge>
              </TableCell>

              <TableCell>{record.utilityType ?? record.utility_type ?? "–"}</TableCell>

              <TableCell>{record.organization ?? "–"}</TableCell>

              <TableCell>
                {getFilePath(record) ? (
                  <button
                    className="text-blue-600 underline hover:text-blue-800 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenFile(record);
                    }}
                  >
                    View File
                  </button>
                ) : (
                  "–"
                )}
              </TableCell>

              <TableCell className="text-right">
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onZoomToRecord(record);
                  }}
                >
                  View
                </button>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
