"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkAreasTableProps {
  workAreas: any[];
  onSelectWorkArea: (id: string) => void;
  onZoomToWorkArea: (wa: any) => void;
}

export function WorkAreasTable({
  workAreas,
  onSelectWorkArea,
  onZoomToWorkArea,
}: WorkAreasTableProps) {
  if (!workAreas || workAreas.length === 0) {
    return <p className="text-sm text-gray-500">No work areas yet.</p>;
  }

  return (
    <div className="rounded-md border bg-white max-h-[28vh] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Work Area</TableHead>
            <TableHead>Records</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {workAreas.map((wa) => (
            <TableRow
              key={wa.id}
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => {
                onSelectWorkArea(wa.id);
                onZoomToWorkArea(wa);
              }}
            >
              <TableCell>{wa.name || "Unnamed Area"}</TableCell>

              <TableCell>{wa.records?.length || 0}</TableCell>

              <TableCell className="text-right">
                <button
                  className="text-blue-600 hover:underline text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectWorkArea(wa.id);
                    onZoomToWorkArea(wa);
                  }}
                >
                  View
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
