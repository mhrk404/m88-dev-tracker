import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSkeleton } from "@/components/ui/skeletons"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { STAGES } from "@/lib/constants"
import { canEditSample } from "@/lib/rbac"
import { getSample, updateSample } from "@/api/samples"
import { getLookups } from "@/api/lookups"
import type { Sample, UpdateSampleInput } from "@/types/sample"
import type { Lookups } from "@/types/lookups"
import type { RoleCode } from "@/lib/constants"
import { useAuth } from "@/contexts/auth"
import { toast } from "sonner"

const STAGE_ORDER: string[] = [
  STAGES.PSI,
  STAGES.SAMPLE_DEVELOPMENT,
  STAGES.PC_REVIEW,
  STAGES.COSTING,
  STAGES.SHIPMENT_TO_BRAND,
]

const STAGE_LABELS: Record<string, string> = {
  [STAGES.PSI]: "PSI Intake (Business Development)",
  [STAGES.SAMPLE_DEVELOPMENT]: "Factory Development Updates",
  [STAGES.PC_REVIEW]: "MD / Product Review Decision",
  [STAGES.COSTING]: "Cost Sheet Processing",
  [STAGES.SHIPMENT_TO_BRAND]: "Brand Delivery Tracking",
}

function getNextStage(currentStage: string | null | undefined): string | null {
  if (!currentStage) return STAGE_ORDER[0] ?? null
  const idx = STAGE_ORDER.indexOf(currentStage)
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null
  return STAGE_ORDER[idx + 1] ?? null
}

export default function SampleEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [sample, setSample] = useState<Sample | null>(null)
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [formData, setFormData] = useState<UpdateSampleInput>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)

  useEffect(() => {
    if (!id) return
    const sampleId = id
    async function loadData() {
      try {
        const [sampleData, lookupsData] = await Promise.all([
          getSample(sampleId),
          getLookups(),
        ])
        setSample(sampleData)
        setLookups(lookupsData)
        setFormData({
          style_name: sampleData.style_name || "",
          color: sampleData.color || "",
          qty: sampleData.qty || undefined,
          season_id: sampleData.season_id,
          brand_id: sampleData.brand_id,
          division: sampleData.division || "",
          product_category: sampleData.product_category || "",
          sample_type: sampleData.sample_type || "",
          coo: sampleData.coo || "",
          unfree_status: sampleData.unfree_status || "",
          sample_status: sampleData.sample_status || "",
          kickoff_date: sampleData.kickoff_date || "",
          sample_due_denver: sampleData.sample_due_denver || "",
          requested_lead_time: sampleData.requested_lead_time || undefined,
          ref_from_m88: sampleData.ref_from_m88 || "No",
          current_status: sampleData.current_status || "",
          current_stage: sampleData.current_stage || "",
        })
      } catch (error) {
        console.error("Failed to load sample:", error)
        toast.error("Failed to load sample")
        navigate("/samples")
      }
    }
    loadData()
  }, [id, navigate])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = validateForm()
    if (ok) setShowSaveConfirm(true)
  }

  function validateForm() {
    const err: Record<string, string> = {}

    // Required fields
    if (!formData.style_name || !formData.style_name.trim()) {
      err.style_name = "Style name is required"
    }
    if (!formData.brand_id) {
      err.brand_id = "Brand is required"
    }
    if (!formData.season_id) {
      err.season_id = "Season is required"
    }
    if (!formData.division || !formData.division.trim()) {
      err.division = "Division is required"
    }
    if (!formData.product_category || !formData.product_category.trim()) {
      err.product_category = "Category is required"
    }
    if (!formData.sample_type || !formData.sample_type.trim()) {
      err.sample_type = "Sample type is required"
    }

    // Optional numeric validations
    if (formData.qty !== undefined && (Number.isNaN(formData.qty) || formData.qty <= 0)) {
      err.qty = "Quantity must be a positive number"
    }
    if (formData.requested_lead_time !== undefined && (Number.isNaN(formData.requested_lead_time) || formData.requested_lead_time < 0)) {
      err.requested_lead_time = "Lead time must be 0 or greater"
    }

    // Date relationships: if both provided, due date should be same or after kickoff
    if (formData.kickoff_date && formData.sample_due_denver) {
      const kd = Date.parse(formData.kickoff_date)
      const dd = Date.parse(formData.sample_due_denver)
      if (!Number.isFinite(kd) || !Number.isFinite(dd)) {
        // ignore malformed dates here, browser date input should ensure format
      } else if (dd < kd) {
        err.sample_due_denver = "Due date must be same or after kickoff date"
      }
    }

    setErrors(err)
    if (Object.keys(err).length > 0) {
      const first = Object.values(err)[0]
      toast.error(first)
      return false
    }
    return true
  }

  function doSave(moveToNextStage: boolean) {
    if (!id) return

    // Build payload now before closing dialog
    let currentStage = formData.current_stage?.trim() || undefined
    if (moveToNextStage) {
      const next = getNextStage(formData.current_stage)
      if (next) currentStage = next
    }
    const payload: UpdateSampleInput = {
      ...formData,
      style_name: formData.style_name?.trim() || undefined,
      color: formData.color?.trim() || undefined,
      qty: formData.qty || undefined,
      coo: formData.coo?.trim() || undefined,
      current_status: formData.current_status?.trim() || undefined,
      current_stage: currentStage,
    }
    const sampleId = id
    const successMsg = moveToNextStage && currentStage
      ? `Moved to next stage: ${STAGE_LABELS[currentStage] ?? currentStage}`
      : "Sample updated successfully"

    // Close confirmation dialog, stay on edit page during countdown
    setShowSaveConfirm(false)

    const DELAY = 7
    let remaining = DELAY
    let cancelled = false

    let intervalId: ReturnType<typeof setInterval>
    let timeoutId: ReturnType<typeof setTimeout>

    function cancel() {
      cancelled = true
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      toast.dismiss(toastId)
      toast.info("Save cancelled — you can continue editing")
    }

    const toastId = toast.loading(`Saving in ${remaining}s — click Undo to cancel`, {
      action: { label: "Undo", onClick: cancel },
      duration: Infinity,
    })

    intervalId = setInterval(() => {
      remaining--
      if (remaining > 0) {
        toast.loading(`Saving in ${remaining}s — click Undo to cancel`, {
          id: toastId,
          action: { label: "Undo", onClick: cancel },
          duration: Infinity,
        })
      }
    }, 1000)

    timeoutId = setTimeout(async () => {
      clearInterval(intervalId)
      if (cancelled) return
      toast.dismiss(toastId)
      setLoading(true)
      try {
        await updateSample(sampleId, payload)
        toast.success(successMsg)
        navigate(`/samples/${sampleId}`)
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } }
        toast.error(err?.response?.data?.error || "Failed to update sample")
      } finally {
        setLoading(false)
      }
    }, DELAY * 1000)
  }

  if (!sample || !lookups) {
    return (
      <div className="p-6">
        <FormSkeleton />
      </div>
    )
  }

  if (!user || !canEditSample(user.roleCode as RoleCode)) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-destructive font-medium">Access denied</p>
        <p className="text-sm text-muted-foreground">Only Admin or PBD can edit sample records.</p>
        <Button variant="link" className="px-0" onClick={() => navigate(`/samples/${id}`)}>
          Back to sample
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              to={id ? `/samples/${id}` : "/samples"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-lg font-black leading-none text-foreground hover:bg-accent"
            >
              &larr;
            </Link>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/samples">Samples</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={id ? `/samples/${id}` : "/samples"}>Details</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Edit</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Edit Sample</h1>
          <p className="text-sm text-muted-foreground">{sample.style_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sample Information</CardTitle>
            <CardDescription className="text-xs">Update the sample details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="style_name" className="text-xs">Style Name *</Label>
                <Input
                  id="style_name"
                  value={formData.style_name || ""}
                  onChange={(e) => setFormData({ ...formData, style_name: e.target.value })}
                  className="h-8 text-sm"
                />
                {errors.style_name && (
                  <p className="text-destructive text-xs mt-1">{errors.style_name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="color" className="text-xs">Color</Label>
                <Input
                  id="color"
                  value={formData.color || ""}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qty" className="text-xs">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  value={formData.qty || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, qty: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="h-8 text-sm"
                />
                {errors.qty && <p className="text-destructive text-xs mt-1">{errors.qty}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coo" className="text-xs">COO</Label>
                <Input
                  id="coo"
                  value={formData.coo || ""}
                  onChange={(e) => setFormData({ ...formData, coo: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="season_id" className="text-xs">Season *</Label>
                <Select
                  value={formData.season_id ? formData.season_id.toString() : undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, season_id: Number(value) })
                  }
                >
                  <SelectTrigger id="season_id" className="h-8 text-sm">
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.seasons.map((season) => (
                      <SelectItem key={season.id} value={season.id.toString()}>
                        {season.code} {season.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.season_id && <p className="text-destructive text-xs mt-1">{errors.season_id}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand_id" className="text-xs">Brand *</Label>
                <Select
                  value={formData.brand_id ? formData.brand_id.toString() : undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, brand_id: Number(value) })
                  }
                >
                  <SelectTrigger id="brand_id" className="h-8 text-sm">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id.toString()}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.brand_id && <p className="text-destructive text-xs mt-1">{errors.brand_id}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="division" className="text-xs">Division *</Label>
                <Select
                  value={formData.division || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, division: value })
                  }
                >
                  <SelectTrigger id="division" className="h-8 text-sm">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.divisions.map((division) => (
                      <SelectItem key={division.id} value={division.name}>
                        {division.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.division && <p className="text-destructive text-xs mt-1">{errors.division}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="product_category" className="text-xs">Category *</Label>
                <Select
                  value={formData.product_category || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, product_category: value })
                  }
                >
                  <SelectTrigger id="product_category" className="h-8 text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.product_categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.product_category && (
                  <p className="text-destructive text-xs mt-1">{errors.product_category}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sample_type" className="text-xs">Sample Type *</Label>
                <Select
                  value={formData.sample_type || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sample_type: value })
                  }
                >
                  <SelectTrigger id="sample_type" className="h-8 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lookups.sample_types.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sample_type && <p className="text-destructive text-xs mt-1">{errors.sample_type}</p>}
              </div>

            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">PBD Header Details</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unfree_status" className="text-xs">Unfree Status</Label>
                  <Select
                    value={formData.unfree_status}
                    onValueChange={(v) => setFormData({ ...formData, unfree_status: v })}
                  >
                    <SelectTrigger id="unfree_status" className="h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">FREE</SelectItem>
                      <SelectItem value="UNFREE">UNFREE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kickoff_date" className="text-xs">Kickoff Date</Label>
                  <Input
                    id="kickoff_date"
                    type="date"
                    className="h-8"
                    value={formData.kickoff_date || ""}
                    onChange={(e) => setFormData({ ...formData, kickoff_date: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sample_due_denver" className="text-xs">Due (Denver)</Label>
                  <Input
                    id="sample_due_denver"
                    type="date"
                    className="h-8"
                    value={formData.sample_due_denver || ""}
                    onChange={(e) => setFormData({ ...formData, sample_due_denver: e.target.value })}
                  />
                  {errors.sample_due_denver && (
                    <p className="text-destructive text-xs mt-1">{errors.sample_due_denver}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="requested_lead_time" className="text-xs">Lead Time</Label>
                  <Input
                    id="requested_lead_time"
                    type="number"
                    className="h-8"
                    value={formData.requested_lead_time || ""}
                    onChange={(e) => setFormData({ ...formData, requested_lead_time: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  {errors.requested_lead_time && (
                    <p className="text-destructive text-xs mt-1">{errors.requested_lead_time}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ref_from_m88" className="text-xs">Ref from M88?</Label>
                  <Select
                    value={formData.ref_from_m88}
                    onValueChange={(v) => setFormData({ ...formData, ref_from_m88: v })}
                  >
                    <SelectTrigger id="ref_from_m88" className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Status & stage removed - editing stages handled via Edit stage flow */}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/samples/${id}`)} size="sm">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm update</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const current = formData.current_stage?.trim() || null
                const next = getNextStage(current)
                const currentLabel = current ? (STAGE_LABELS[current] ?? current) : "—"
                const nextLabel = next ? (STAGE_LABELS[next] ?? next) : "—"
                if (next) {
                  return (
                    <>
                      Save your changes and move this sample to the next stage?
                      <span className="mt-2 block font-medium text-foreground">
                        Current: {currentLabel} → Next: {nextLabel}
                      </span>
                    </>
                  )
                }
                return (
                  <>
                    Save your changes without moving to a new stage?
                    <span className="mt-2 block text-muted-foreground">
                      (Already at final stage: {currentLabel})
                    </span>
                  </>
                )
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              disabled={loading}
              onClick={() => doSave(false)}
              size="sm"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
