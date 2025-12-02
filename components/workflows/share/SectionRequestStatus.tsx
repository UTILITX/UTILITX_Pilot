"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useProjectStore } from "@/zustand/projectStore"
import { formatDistanceToNow } from "date-fns"

export default function SectionRequestStatus() {
  const recordRequests = useProjectStore((state) => state.recordRequests)
  const updateRecordRequestStatus = useProjectStore((state) => state.updateRecordRequestStatus)

  return (
    <section className="border-b border-border/50 pb-6">
      <h2 className="text-lg font-semibold mb-1">Request Status</h2>
      <p className="text-sm text-muted-foreground mb-4">Track record requests you've sent.</p>

      <div className="space-y-3">
        {recordRequests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium">{request.recipient}</p>
              <p className="text-xs text-muted-foreground">
                {request.recordTypes.join(", ")} · Requested {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={request.status === "Received" ? "secondary" : "outline"}>
                {request.status}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                disabled={request.status === "Received"}
                onClick={() => updateRecordRequestStatus(request.id, "Received")}
              >
                Mark Received (demo)
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}





