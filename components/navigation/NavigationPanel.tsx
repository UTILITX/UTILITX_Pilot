"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { XIcon } from "@/lib/icons"
import { cn } from "@/lib/utils"
import type { IndexedRecord } from "@/lib/fetchAllEsriData"
import ShareDrawer from "@/components/workflows/share-drawer"

// Custom SheetContent without overlay for GIS-style right panel
const RightPanelSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetPrimitive.Content
      ref={ref}
      data-slot="sheet-content"
      className={cn(
        "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-[3000] flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
        "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-full sm:w-[420px] lg:w-[480px] border-l border-[var(--utilitx-gray-200)]",
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
        <XIcon className="size-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
))
RightPanelSheetContent.displayName = "RightPanelSheetContent"

type NavigationMode = "workareas" | "records" | "insights" | "share" | "settings"

interface NavigationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: NavigationMode
  esriRecords?: IndexedRecord[]
  workAreas?: Array<{
    id: string
    name: string
    region?: string
    owner?: string
    createdBy?: string
    date?: string
    notes?: string
    records?: any[]
  }>
  selectedWorkArea?: {
    id: string
    name?: string
    [key: string]: any
  } | null
  onSelectWorkArea?: (id: string | null) => void
  onZoomToRecord?: (record: IndexedRecord) => void
  onZoomToWorkArea?: (workArea: { id: string; name: string; [key: string]: any }) => void
}

export function NavigationPanel({
  open,
  onOpenChange,
  mode,
  esriRecords = [],
  workAreas = [],
  selectedWorkArea,
  onSelectWorkArea,
  onZoomToRecord,
  onZoomToWorkArea,
}: NavigationPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false} onInteractOutside={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
      <RightPanelSheetContent className="group overflow-y-auto p-6 bg-white animate-slideInRight animate-fadeIn" style={{ boxShadow: "var(--utilitx-shadow-md)" }}>
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold text-[var(--utilitx-gray-900)]">
            {mode === "workareas" && "Work Areas"}
            {mode === "records" && "Records"}
            {mode === "insights" && "Insights"}
            {mode === "share" && "Share"}
            {mode === "settings" && "Settings"}
          </SheetTitle>
          <SheetDescription>
            {mode === "workareas" && "View and manage work areas"}
            {mode === "records" && "Browse and filter utility records"}
            {mode === "insights" && "Project analytics and insights"}
            {mode === "share" && "Share and collaborate"}
            {mode === "settings" && "Project settings and preferences"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {mode === "workareas" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--utilitx-gray-600)]">
                {workAreas.length} work area{workAreas.length !== 1 ? "s" : ""} in this project.
              </p>
              <div className="space-y-2">
                {workAreas.map((wa) => (
                  <div
                    key={wa.id}
                    className="p-3 rounded-lg border border-[var(--utilitx-gray-200)] hover:bg-[var(--utilitx-gray-50)] cursor-pointer"
                    onClick={() => {
                      onSelectWorkArea?.(wa.id)
                      onZoomToWorkArea?.(wa)
                    }}
                  >
                    <div className="font-medium text-sm text-[var(--utilitx-gray-900)]">{wa.name}</div>
                    {wa.region && <div className="text-xs text-[var(--utilitx-gray-600)] mt-1">{wa.region}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === "records" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--utilitx-gray-600)]">
                {esriRecords.length} record{esriRecords.length !== 1 ? "s" : ""} in this project.
              </p>
              <div className="space-y-2">
                {esriRecords.slice(0, 20).map((record) => (
                  <div
                    key={record.id}
                    className="p-3 rounded-lg border border-[var(--utilitx-gray-200)] hover:bg-[var(--utilitx-gray-50)] cursor-pointer"
                    onClick={() => onZoomToRecord?.(record)}
                  >
                    <div className="font-medium text-sm text-[var(--utilitx-gray-900)]">
                      {record.utilityType || "Unknown"} • {record.recordType || "Record"}
                    </div>
                    {record.organization && <div className="text-xs text-[var(--utilitx-gray-600)] mt-1">{record.organization}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === "insights" && (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--utilitx-gray-600)]">Insights coming soon.</p>
              <p className="text-xs text-[var(--utilitx-gray-500)] mt-2">Analytics and project insights will be available here.</p>
            </div>
          )}

          {mode === "share" && (
            <div className="space-y-3">
              <ShareDrawer currentWorkArea={selectedWorkArea || undefined} />
            </div>
          )}

          {mode === "settings" && (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--utilitx-gray-600)]">Project settings coming soon.</p>
              <p className="text-xs text-[var(--utilitx-gray-500)] mt-2">Project configuration and preferences will be available here.</p>
            </div>
          )}
        </div>
      </RightPanelSheetContent>
    </Sheet>
  )
}


