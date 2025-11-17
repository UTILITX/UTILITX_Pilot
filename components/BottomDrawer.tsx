"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RecordsTable } from "@/components/tables/RecordsTable";
import { WorkAreasTable } from "@/components/tables/WorkAreasTable";
import type { IndexedRecord } from "@/lib/fetchAllEsriData";

interface WorkArea {
  id: string;
  name: string;
  region?: string;
  owner?: string;
  createdBy?: string;
  date?: string;
  notes?: string;
  records?: any[];
}

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: IndexedRecord[];
  workAreas: WorkArea[];
  selectedWorkArea: WorkArea | null;
  onSelectWorkArea: (id: string | null) => void;
  onZoomToRecord: (record: IndexedRecord) => void;
  onZoomToWorkArea: (workArea: WorkArea) => void;
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
  // Filter state - lifted up to persist across tab switches
  const [utilityFilter, setUtilityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [geometryFilter, setGeometryFilter] = useState<string>("all");
  const [hasFileFilter, setHasFileFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [heightRatio, setHeightRatio] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);

  const updateHeight = (clientY: number) => {
    const windowHeight = window.innerHeight || 1;
    const ratio = Math.min(0.9, Math.max(0.2, (windowHeight - clientY) / windowHeight));
    setHeightRatio(ratio);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (event: MouseEvent | TouchEvent) => {
      const clientY = event instanceof TouchEvent ? event.touches[0]?.clientY : (event as MouseEvent).clientY;
      if (typeof clientY === "number") {
        updateHeight(clientY);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white shadow-xl border-t z-[5000]",
        "transition-all duration-200 ease-out flex flex-col"
      )}
      style={{ height: `${heightRatio * 100}vh` }}
    >
      {/* HEADER */}
      <div className="flex flex-col border-b flex-shrink-0">
        <div
          className="w-full flex items-center justify-center py-2 cursor-row-resize select-none"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            setIsDragging(true);
            const touch = e.touches[0];
            if (touch) updateHeight(touch.clientY);
          }}
        >
          <div className="w-12 h-1.5 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="font-semibold text-lg">Project Index</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Close
          </button>
        </div>
      </div>

      <Tabs defaultValue="records" className="flex flex-col h-full overflow-hidden">
        <div className="px-4">
          <TabsList className="grid grid-cols-2 w-[300px] my-2">
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="workareas">Work Areas</TabsTrigger>
          </TabsList>
        </div>

        {/* RECORDS */}
        <TabsContent value="records" className="mt-0 flex-1 overflow-y-auto px-4">
          <RecordsTable
            records={records}
            onZoomToRecord={onZoomToRecord}
            utilityFilter={utilityFilter}
            setUtilityFilter={setUtilityFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            orgFilter={orgFilter}
            setOrgFilter={setOrgFilter}
            geometryFilter={geometryFilter}
            setGeometryFilter={setGeometryFilter}
            hasFileFilter={hasFileFilter}
            setHasFileFilter={setHasFileFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </TabsContent>

        {/* WORK AREAS */}
        <TabsContent value="workareas" className="mt-0 flex-1 overflow-y-auto px-4">
          <WorkAreasTable
            workAreas={workAreas}
            onSelectWorkArea={onSelectWorkArea}
            onZoomToWorkArea={onZoomToWorkArea}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

