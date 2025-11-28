"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useProjectStore } from "@/zustand/projectStore"
import { buildSharedProject, persistSharedWorkarea } from "@/lib/share"

type Props = {
  recordTypes: string[]
  workAreaName?: string
}

export default function SectionRequestRecords({ recordTypes, workAreaName }: Props) {
  const addRecordRequest = useProjectStore((state) => state.addRecordRequest)
  const [recipient, setRecipient] = useState("")
  const [message, setMessage] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const currentProject = useWorkspaceStore((state) => state.currentProject)
  const demoProject = useProjectStore((state) => state.demoProject)
  const setProject = useProjectStore((state) => state.setProject)
  const sharedProject = useMemo(
    () => buildSharedProject(currentProject, demoProject),
    [currentProject, demoProject],
  )

  const handleTypeChange = (type: string, checked?: boolean) => {
    setSelectedTypes((prev) => {
      if (checked) {
        if (prev.includes(type)) return prev
        return [...prev, type]
      }
      return prev.filter((item) => item !== type)
    })
  }

  const handleSendRequest = () => {
    const trimmedRecipient = recipient.trim()
    if (!trimmedRecipient) {
      toast({ title: "Enter a recipient to send to." })
      return
    }
    if (!selectedTypes.length) {
      toast({ title: "Select at least one record type." })
      return
    }
    addRecordRequest({
      recipient: trimmedRecipient,
      recordTypes: selectedTypes,
    })
    setProject(sharedProject)
    persistSharedWorkarea(sharedProject)
    setRecipient("")
    setMessage("")
    setSelectedTypes([])
    toast({ title: "Record request sent" })
  }

  return (
    <section className="border-b border-border/50 pb-6">
      <h2 className="text-lg font-semibold mb-1">Request Records</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ask utilities, owners, or contractors to share documents for this Work Area.
      </p>

      <div className="p-3 rounded-md border mb-4 bg-muted/10">
        <p className="text-sm font-medium">{workAreaName || "Work Area Name"}</p>
        <p className="text-xs text-muted-foreground">Area size + Complexity</p>
      </div>

      <div className="grid gap-2 mb-4 sm:grid-cols-2">
        {recordTypes.map((type) => (
          <label
            key={type}
            className="flex items-center gap-2 rounded-lg border border-border/60 p-3 text-sm transition hover:border-primary"
          >
            <Checkbox
              checked={selectedTypes.includes(type)}
              onCheckedChange={(value) => handleTypeChange(type, value === true)}
            />
            {type}
          </label>
        ))}
      </div>

      <Input
        placeholder="Add utility or contact…"
        className="mb-3"
        value={recipient}
        onChange={(event) => setRecipient(event.target.value)}
      />
      <Textarea
        placeholder="Add a message…"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className="mb-3"
        rows={3}
      />

      <Button onClick={handleSendRequest} className="w-full" type="button">
        Send Request
      </Button>
    </section>
  )
}

