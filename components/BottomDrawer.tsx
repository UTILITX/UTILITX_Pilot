"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: any[];
  workAreas: any[];
  selectedWorkArea: any | null;
  onSelectWorkArea: (id: string | null) => void;
  onZoomToRecord: (record: any) => void;
  onZoomToWorkArea: (workArea: any) => void;
}

export default function BottomDrawer({
  isOpen,
  onClose,
  records,
  workAreas,
  selectedWorkArea,
  onSelectWorkArea,
  onZoomToRecord,
  onZoomToWorkArea,
}: BottomDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white shadow-xl border-t z-[5000]",
        "transition-all duration-300",
        isOpen ? "h-[40vh]" : "h-0"
      )}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="font-semibold text-lg">Project Index</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Close
        </button>
      </div>

      <Tabs defaultValue="records" className="px-4">
        <TabsList className="grid grid-cols-2 w-[300px] my-2">
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="workareas">Work Areas</TabsTrigger>
        </TabsList>

        {/* RECORDS */}
        <TabsContent value="records">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              Showing {records.length} records
              {selectedWorkArea && (
                <span className="ml-2 text-blue-600">
                  (Filtered to: {selectedWorkArea.name})
                </span>
              )}
            </p>

            {/* TEMP basic list - will replace with DataTable */}
            <div className="border rounded p-3 bg-gray-50 max-h-[28vh] overflow-y-auto">
              {records.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between py-1 border-b cursor-pointer"
                  onClick={() => onZoomToRecord(rec)}
                >
                  <span>{rec.name || rec.fileName || "Record"}</span>
                  <span className="text-xs text-gray-500">
                    {rec.utility_type || ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* WORK AREAS */}
        <TabsContent value="workareas">
          <p className="text-sm text-gray-600 mb-2">
            Showing {workAreas.length} work areas
          </p>

          <div className="border rounded p-3 bg-gray-50 max-h-[28vh] overflow-y-auto">
            {workAreas.map((wa) => (
              <div
                key={wa.id}
                className="flex items-center justify-between py-1 border-b cursor-pointer"
                onClick={() => {
                  onSelectWorkArea(wa.id);
                  onZoomToWorkArea(wa);
                }}
              >
                <span>{wa.name || "Unnamed Work Area"}</span>
                <span className="text-xs text-gray-500">
                  {wa.records?.length || 0} records
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

