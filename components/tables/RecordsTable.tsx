"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RecordsTableProps {
  records: any[];
  onZoomToRecord: (record: any) => void;
}

export function RecordsTable({ records, onZoomToRecord }: RecordsTableProps) {
  if (!records || records.length === 0) {
    return <p className="text-sm text-gray-500">No records yet.</p>;
  }

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
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
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
