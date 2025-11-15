import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Map, ArrowRight } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to UTILITX. Get started by accessing the map workflow.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/map">
          <div className="p-6 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3 mb-2">
              <Map className="h-6 w-6 text-[#0D1B2A]" />
              <h2 className="text-lg font-semibold">Map Workflow</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Access the full map workflow with drawing tools, upload panel, and record management.
            </p>
            <Button variant="outline" className="w-full">
              Open Map <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Link>
      </div>
    </div>
  )
}

