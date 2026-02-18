import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loading } from "@/components/ui/loading"
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs"
import { STAGES } from "@/lib/constants"
import { getSampleFull } from "@/api/samples"
import type { SampleFull } from "@/types/sample"
import { useAuth } from "@/contexts/auth"
import { canEditSample } from "@/lib/rbac"
import type { RoleCode } from "@/lib/constants"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const stageSteps = [
  { key: STAGES.PRODUCT_BUSINESS_DEV, label: "PD", name: "Product / Business Dev" },
  { key: STAGES.TECHNICAL_DESIGN, label: "TD", name: "Technical Design" },
  { key: STAGES.FACTORY_EXECUTION, label: "FTY", name: "Factory Execution" },
  { key: STAGES.MERCHANDISING_REVIEW, label: "MD", name: "Merch Review" },
  { key: STAGES.COSTING_ANALYSIS, label: "COST", name: "Costing Analysis" },
] as const

function currentStageIndex(stage: string | null | undefined): number {
  if (!stage) return 0
  const idx = stageSteps.findIndex((s) => s.key === stage)
  return idx === -1 ? 0 : idx
}

export default function SampleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sample, setSample] = useState<SampleFull | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const sampleId = id
    async function loadSample() {
      try {
        const data = await getSampleFull(sampleId)
        setSample(data)
      } catch (error) {
        console.error("Failed to load sample:", error)
        toast.error("Failed to load sample")
        navigate("/samples")
      } finally {
        setLoading(false)
      }
    }
    loadSample()
  }, [id, navigate])

  const canEdit = user ? canEditSample(user.roleCode as RoleCode) : false

  if (loading) {
    return <Loading fullScreen text="Loading sample..." />
  }

  if (!sample) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Sample not found</div>
      </div>
    )
  }

  const stageIdx = currentStageIndex(sample.current_stage)
  const progressPct =
    stageSteps.length > 1 ? (stageIdx / (stageSteps.length - 1)) * 100 : 0

  return (
    <div className="space-y-4 p-6">
      <PageBreadcrumbs />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/samples")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{sample.style_number}</h1>
        </div>
        {canEdit && (
          <Button variant="outline" onClick={() => navigate(`/samples/${id}/edit`)} size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <Card className="border-0 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Milestones</CardTitle>
          <CardDescription className="text-xs">
            Track progress across the 5 workflow stages.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Current:</span>
              {sample.current_stage ? (
                <Badge variant="secondary" className="text-xs">
                  {sample.current_stage}
                </Badge>
              ) : (
                <span>-</span>
              )}
              <span className="mx-1">•</span>
              <span>Status:</span>
              {sample.current_status ? (
                <Badge variant="outline" className="text-xs">
                  {sample.current_status}
                </Badge>
              ) : (
                <span>-</span>
              )}
            </div>

            <div className="relative">
              {/* single tracker line (desktop) */}
              <div className="absolute left-3 right-3 top-3 hidden h-px bg-border md:block" />
              <div
                className="absolute left-3 top-3 hidden h-px bg-emerald-500/50 md:block"
                style={{ width: `calc(${progressPct}% - 12px)` }}
              />

              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-2">
                {stageSteps.map((step, idx) => {
                  const isCompleted = idx < stageIdx
                  const isCurrent = idx === stageIdx
                  const dotClass = isCompleted
                    ? "bg-emerald-500"
                    : isCurrent
                      ? "bg-blue-500"
                      : "bg-muted-foreground/40"

                  return (
                    <div key={step.key} className="flex items-center gap-3 md:flex-col md:items-center md:gap-1.5">
                      <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background">
                        <div className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                      </div>
                      <div className="min-w-0 text-left md:text-center">
                        <div className="text-xs font-semibold text-foreground">{step.label}</div>
                        <div className="text-xs text-muted-foreground">{step.name}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Style Number</div>
                <div className="text-sm font-semibold">{sample.style_number}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Style Name</div>
                <div className="text-sm">{sample.style_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Color</div>
                <div className="text-sm">{sample.color || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Quantity</div>
                <div className="text-sm">{sample.qty ?? "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">COO</div>
                <div className="text-sm">{sample.coo || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Season</div>
                <div className="text-sm">
                  {sample.seasons ? `${sample.seasons.name} ${sample.seasons.year}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Brand</div>
                <div className="text-sm">{sample.brands?.name || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Division</div>
                <div className="text-sm">{sample.divisions?.name || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Category</div>
                <div className="text-sm">{sample.product_categories?.name || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-medium text-muted-foreground mb-1">Sample Type</div>
                <div className="text-sm">{sample.sample_types?.name || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status & Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
                <div>
                  {sample.current_status ? (
                    <Badge variant="outline" className="text-xs">{sample.current_status}</Badge>
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Stage</div>
                <div>
                  {sample.current_stage ? (
                    <Badge variant="secondary" className="text-xs">{sample.current_stage}</Badge>
                  ) : (
                    <span className="text-sm">-</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Created</div>
                <div className="text-sm">{new Date(sample.created_at).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Updated</div>
                <div className="text-sm">{new Date(sample.updated_at).toLocaleDateString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {sample.shipping.length > 0 && (
          <Card className="md:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shipping</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-9">AWB</TableHead>
                    <TableHead className="h-9">Origin</TableHead>
                    <TableHead className="h-9">Destination</TableHead>
                    <TableHead className="h-9">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.shipping.map((ship) => (
                    <TableRow key={ship.id}>
                      <TableCell className="py-2">{ship.awb || "-"}</TableCell>
                      <TableCell className="py-2">{ship.origin || "-"}</TableCell>
                      <TableCell className="py-2">{ship.destination || "-"}</TableCell>
                      <TableCell className="py-2">{ship.status || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {sample.status_transitions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Transitions</CardTitle>
            <CardDescription className="text-xs">History of status and stage changes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9">From</TableHead>
                  <TableHead className="h-9">To</TableHead>
                  <TableHead className="h-9">Stage</TableHead>
                  <TableHead className="h-9">Date</TableHead>
                  <TableHead className="h-9">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sample.status_transitions.map((transition) => (
                  <TableRow key={transition.id}>
                    <TableCell className="py-2">{transition.from_status || "-"}</TableCell>
                    <TableCell className="py-2">{transition.to_status || "-"}</TableCell>
                    <TableCell className="py-2">{transition.stage || "-"}</TableCell>
                    <TableCell className="py-2 text-xs">{new Date(transition.transitioned_at).toLocaleString()}</TableCell>
                    <TableCell className="py-2">{transition.notes || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
