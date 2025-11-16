"use client";

import { useState } from "react";
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

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white shadow-xl border-t z-[4000]",
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
        <TabsContent value="records" className="mt-0">
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
        <TabsContent value="workareas" className="mt-0">
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

