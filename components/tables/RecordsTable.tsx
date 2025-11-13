"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSignedUrl } from "@/lib/supabase";

interface RecordsTableProps {
  records: any[];
  onZoomToRecord: (record: any) => void;
}

export function RecordsTable({ records, onZoomToRecord }: RecordsTableProps) {
  // Filter state
  const [utilityFilter, setUtilityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [geometryFilter, setGeometryFilter] = useState<string>("");
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [hasFileFilter, setHasFileFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Create a derived filtered list
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (utilityFilter && r.utilityType !== utilityFilter) return false;
      if (typeFilter && r.recordType !== typeFilter) return false;
      if (geometryFilter && r.geometryType !== geometryFilter) return false;
      if (orgFilter && r.organization !== orgFilter) return false;

      if (hasFileFilter === "yes" && !r.fileUrl) return false;
      if (hasFileFilter === "no" && r.fileUrl) return false;

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        // Build searchable text from available fields
        const recordName = r.name || r.fileName || 
          (r.recordType && r.utilityType 
            ? `${r.utilityType} / ${r.recordType}` 
            : "Record");
        const target = `${recordName} ${r.recordType || ""} ${r.utilityType || ""} ${r.organization || ""}`
          .toLowerCase();
        if (!target.includes(s)) return false;
      }

      return true;
    });
  }, [records, utilityFilter, typeFilter, geometryFilter, orgFilter, hasFileFilter, searchQuery]);

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
