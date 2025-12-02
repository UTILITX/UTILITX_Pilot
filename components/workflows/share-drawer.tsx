"use client"

import SectionCollaborators from "@/components/workflows/share/SectionCollaborators"
import SectionRequestRecords from "@/components/workflows/share/SectionRequestRecords"
import SectionRequestStatus from "@/components/workflows/share/SectionRequestStatus"
import SectionShareLink from "@/components/workflows/share/SectionShareLink"

type Props = {
  currentWorkArea?: {
    id?: string
    name?: string
  } | null
}

const recordTypes = ["As-Builts", "Construction Drawings", "Fiber Plans", "Gas Maps", "Sewer / Water"]

export default function ShareDrawer({ currentWorkArea }: Props) {
  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-4 space-y-6">
      <SectionCollaborators />
      <SectionRequestRecords recordTypes={recordTypes} workAreaName={currentWorkArea?.name} />
      <SectionRequestStatus />
      <SectionShareLink />
    </div>
  )
}




