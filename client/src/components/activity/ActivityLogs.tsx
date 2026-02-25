import { useEffect, useState } from "react"
import { getSampleHistory } from "@/api/audit"
import type { SampleHistoryEntry, StatusTransition } from "@/api/audit"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ActivityLogsProps {
  sampleId: string
}

export default function ActivityLogs({ sampleId }: ActivityLogsProps) {
  const [history, setHistory] = useState<SampleHistoryEntry[]>([])
  const [transitions, setTransitions] = useState<StatusTransition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true)
        const data = await getSampleHistory(sampleId)
        setHistory(data.sample_history || [])
        setTransitions(data.status_transitions || [])
      } catch (err: any) {
        setError(err.message || "Failed to load activity history")
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [sampleId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {transitions && transitions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Changes</CardTitle>
            <CardDescription className="text-xs">Log of status and stage transitions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 text-xs">Date/Time</TableHead>
                    <TableHead className="h-9 text-xs">From Status</TableHead>
                    <TableHead className="h-9 text-xs">To Status</TableHead>
                    <TableHead className="h-9 text-xs">Stage</TableHead>
                    <TableHead className="h-9 text-xs">Changed By</TableHead>
                    <TableHead className="h-9 text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transitions.map((transition) => (
                    <TableRow key={transition.id} className="text-xs">
                      <TableCell className="py-2 whitespace-nowrap">
                        {new Date(transition.transitioned_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-xs">
                          {transition.from_status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="default" className="text-xs">
                          {transition.to_status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">{transition.to_stage || "-"}</TableCell>
                      <TableCell className="py-2">
                        {transition.users?.full_name || transition.users?.username || "-"}
                      </TableCell>
                      <TableCell className="py-2">{transition.reason || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {history && history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Field Changes</CardTitle>
            <CardDescription className="text-xs">History of field modifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9 text-xs">Date/Time</TableHead>
                    <TableHead className="h-9 text-xs">Table</TableHead>
                    <TableHead className="h-9 text-xs">Field</TableHead>
                    <TableHead className="h-9 text-xs">Old Value</TableHead>
                    <TableHead className="h-9 text-xs">New Value</TableHead>
                    <TableHead className="h-9 text-xs">Changed By</TableHead>
                    <TableHead className="h-9 text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id} className="text-xs">
                      <TableCell className="py-2 whitespace-nowrap">
                        {new Date(entry.changed_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2 font-medium">{entry.table_name}</TableCell>
                      <TableCell className="py-2">{entry.field_name}</TableCell>
                      <TableCell className="py-2 max-w-xs truncate" title={entry.old_value || "-"}>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {entry.old_value ? (entry.old_value.length > 30 ? entry.old_value.substring(0, 30) + '...' : entry.old_value) : "-"}
                        </code>
                      </TableCell>
                      <TableCell className="py-2 max-w-xs truncate" title={entry.new_value || "-"}>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {entry.new_value ? (entry.new_value.length > 30 ? entry.new_value.substring(0, 30) + '...' : entry.new_value) : "-"}
                        </code>
                      </TableCell>
                      <TableCell className="py-2">
                        {entry.users?.full_name || entry.users?.username || "-"}
                      </TableCell>
                      <TableCell className="py-2">{entry.change_notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {(!history || history.length === 0) && (!transitions || transitions.length === 0) && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">No activity history available for this sample.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
