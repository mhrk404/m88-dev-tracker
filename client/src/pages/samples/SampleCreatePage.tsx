import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PageBreadcrumbs from "@/components/layout/PageBreadcrumbs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createSample } from "@/api/samples"
import { getLookups } from "@/api/lookups"
import type { CreateSampleInput } from "@/types/sample"
import type { Lookups } from "@/types/lookups"
import { useAuth } from "@/contexts/auth"
import { STAGES } from "@/lib/constants"
import { toast } from "sonner"

function computeLeadTime(kickoff: string | undefined, due: string | undefined) {
  if (!kickoff || !due) return undefined
  const kd = Date.parse(kickoff)
  const dd = Date.parse(due)
  if (!Number.isFinite(kd) || !Number.isFinite(dd)) return undefined
  const days = Math.ceil((dd - kd) / (1000 * 60 * 60 * 24))
  return days > 0 ? days : 0
}

function classifyLeadTime(days: number | undefined | null): "STND" | "RUSH" | undefined {
  if (days == null) return undefined
  if (days === 0) return undefined
  if (days > 119) return "STND"
  if (days >= 1 && days <= 119) return "RUSH"
  return undefined
}

export default function SampleCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  // Flat form data for easier binding
  const [formData, setFormData] = useState<any>({
    style_number: "",
    style_name: "",
    color: "",
    qty: undefined,
    season_id: undefined,
    brand_id: undefined,
    division: "",
    product_category: "",
    sample_type: "",
    sample_type_group: "",
    coo: "",
    unfree_status: "",
    kickoff_date: "",
    sample_due_denver: "",
    requested_lead_time: undefined,
    lead_time_type: "Days",
    ref_from_m88: "No",
    ref_sample_to_fty: "No",
    additional_notes: "",
    sample_status: "Active",
    current_status: "Pending",
    current_stage: STAGES.PSI,
  })

  useEffect(() => {
    async function loadLookups() {
      try {
        const data = await getLookups()
        setLookups(data)
      } catch (error) {
        console.error("Failed to load lookups:", error)
        toast.error("Failed to load form data")
      }
    }
    loadLookups()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      toast.error("You must be logged in to create a sample")
      return
    }

    if (!formData.style_number.trim()) {
      toast.error("Style number is required")
      return
    }

    if (!formData.style_name || !formData.style_name.trim()) {
      toast.error("Style name is required")
      return
    }

    if (!formData.color || !formData.color.trim()) {
      toast.error("Color is required")
      return
    }

    if (formData.qty === undefined || formData.qty === null || formData.qty === "") {
      toast.error("Quantity is required")
      return
    }

    if (!formData.coo || !formData.coo.trim()) {
      toast.error("COO is required")
      return
    }

    if (!formData.sample_type || !formData.sample_type.trim()) {
      toast.error("Sample type is required")
      return
    }

    if (!formData.season_id || !formData.brand_id) {
      toast.error("Season and Brand are required")
      return
    }

    setLoading(true)
    try {
      const payload: CreateSampleInput = {
        style: {
          style_number: formData.style_number.trim(),
          style_name: formData.style_name?.trim() || "",
          color: formData.color?.trim() || "",
          qty: formData.qty,
          season_id: Number(formData.season_id),
          brand_id: Number(formData.brand_id),
          division: formData.division,
          product_category: formData.product_category,
          coo: formData.coo,
        },
        unfree_status: formData.unfree_status,
        sample_type: formData.sample_type,
        sample_type_group: formData.sample_type_group,
        sample_status: formData.sample_status || "Active",
        kickoff_date: formData.kickoff_date || null,
        sample_due_denver: formData.sample_due_denver || null,
        requested_lead_time: formData.requested_lead_time != null ? formData.requested_lead_time : null,
        lead_time_type: formData.lead_time_type || "Days",
        
        ref_from_m88: formData.ref_from_m88,
        ref_sample_to_fty: formData.ref_sample_to_fty,
        additional_notes: formData.additional_notes,
        current_status: formData.current_status || "Pending",
        current_stage: formData.current_stage || STAGES.PSI,
        created_by: user.id,
      }
      if ((payload.requested_lead_time == null || payload.requested_lead_time === undefined) && payload.kickoff_date && payload.sample_due_denver) {
        const computed = computeLeadTime(payload.kickoff_date, payload.sample_due_denver)
        if (computed !== undefined) {
          payload.requested_lead_time = computed
          payload.lead_time_type = classifyLeadTime(computed)
        }
      } else if (payload.requested_lead_time != null) {
        payload.lead_time_type = classifyLeadTime(Number(payload.requested_lead_time))
      }

      const sample = await createSample(payload)
      toast.success("Sample created successfully")
      navigate(`/samples/${sample.id}`)
    } catch (error: any) {
      console.error("Failed to create sample:", error)
      toast.error(error.response?.data?.error || "Failed to create sample")
    } finally {
      setLoading(false)
    }
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "")
    if (lines.length === 0) return []
    const headers = lines[0].split(",").map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const cells = line.split(",")
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = (cells[idx] ?? "").trim()
      })
      return row
    })
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!user) {
      toast.error("You must be logged in to import samples")
      return
    }

    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      if (rows.length === 0) {
        toast.error("CSV file is empty")
        return
      }

      let success = 0
      let failed = 0

      for (const row of rows) {
        const style_number = row.style_number || row.styleNumber
        if (!style_number) {
          failed++
          continue
        }

        const payload: CreateSampleInput = {
          style: {
            brand_id: Number(row.brand_id || row.brandId || 0),
            season_id: Number(row.season_id || row.seasonId || 0),
            style_number: style_number.trim(),
            style_name: row.style_name || row.styleName || "",
            division: row.division || "",
            product_category: row.product_category || row.productCategory || "",
            color: row.color || "",
            qty: row.qty ? Number(row.qty) : undefined,
            coo: row.coo || "",
          },
          unfree_status: row.unfree_status || "",
          sample_type: row.sample_type || row.sampleType || "",
          sample_status: (row.sample_status || row.sampleStatus || "Active").trim() || "Active",
          kickoff_date: row.kickoff_date || "",
          sample_due_denver: row.sample_due_denver || "",
          current_status: (row.current_status || row.currentStatus || "Pending").trim() || "Pending",
          current_stage:
            (row.current_stage || row.currentStage || STAGES.PSI).trim() ||
            STAGES.PSI,
          requested_lead_time: (row.requested_lead_time ? Number(row.requested_lead_time) : undefined) ?? computeLeadTime(row.kickoff_date || row.kickoffDate, row.sample_due_denver || row.sampleDueDenver),
          lead_time_type: classifyLeadTime((row.requested_lead_time ? Number(row.requested_lead_time) : undefined) ?? computeLeadTime(row.kickoff_date || row.kickoffDate, row.sample_due_denver || row.sampleDueDenver)),
          created_by: user.id,
        }

        try {
          await createSample(payload)
          success++
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Failed to import sample row:", err)
          failed++
        }
      }

      if (success === 0) {
        toast.error("No samples were imported. Please check your CSV format.")
        return
      }

      toast.success(
        failed > 0
          ? `Imported ${success} sample(s). ${failed} row(s) failed.`
          : `Imported ${success} sample(s) successfully.`
      )
      navigate("/samples")
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to import samples:", err)
      toast.error("Failed to import samples from CSV")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <PageBreadcrumbs compact />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/samples")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            disabled={loading || importing}
          >
            <Upload className="h-4 w-4 mr-1" />
            {importing ? "Importing..." : "Import from CSV"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Sample Information</CardTitle>
            <CardDescription>Enter the sample details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="style_number">
                  Style Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="style_number"
                  value={formData.style_number}
                  onChange={(e) => setFormData({ ...formData, style_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="style_name">Style Name</Label>
                <Input
                  id="style_name"
                  value={formData.style_name}
                  onChange={(e) => setFormData({ ...formData, style_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  value={formData.qty || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, qty: e.target.value ? Number(e.target.value) : undefined })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coo">COO</Label>
                <Input
                  id="coo"
                  value={formData.coo}
                  onChange={(e) => setFormData({ ...formData, coo: e.target.value })}
                  required
                />
              </div>

              {lookups && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="season_id">
                      Season <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.season_id ? formData.season_id.toString() : undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, season_id: Number(value) })
                      }
                      required
                    >
                      <SelectTrigger id="season_id">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand_id">
                      Brand <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.brand_id ? formData.brand_id.toString() : undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, brand_id: Number(value) })
                      }
                      required
                    >
                      <SelectTrigger id="brand_id">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <Select
                      value={formData.division}
                      onValueChange={(value) => setFormData({ ...formData, division: value })}
                    >
                      <SelectTrigger id="division">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product_category">Category</Label>
                    <Select
                      value={formData.product_category}
                      onValueChange={(value) => setFormData({ ...formData, product_category: value })}
                    >
                      <SelectTrigger id="product_category">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sample_type">Sample Type</Label>
                    <Select
                      value={formData.sample_type}
                        onValueChange={(value) => setFormData({ ...formData, sample_type: value })}
                        required
                    >
                      <SelectTrigger id="sample_type">
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
                  </div>
                </>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold mb-4">PBD Header Details</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="unfree_status">Unfree Status</Label>
                  <Select
                    value={formData.unfree_status}
                    onValueChange={(v) => setFormData({ ...formData, unfree_status: v })}
                  >
                    <SelectTrigger id="unfree_status">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">FREE</SelectItem>
                      <SelectItem value="UNFREE">UNFREE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kickoff_date">Kickoff Date</Label>
                  <Input
                    id="kickoff_date"
                    type="date"
                    value={formData.kickoff_date}
                    onChange={(e) => setFormData({ ...formData, kickoff_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sample_due_denver">Sample Due (Denver)</Label>
                  <Input
                    id="sample_due_denver"
                    type="date"
                    value={formData.sample_due_denver}
                    onChange={(e) => setFormData({ ...formData, sample_due_denver: e.target.value })}
                  />
                </div>
                {/* Requested Lead Time removed from create form */}
                <div className="space-y-2">
                  <Label htmlFor="ref_from_m88">Ref from M88?</Label>
                  <Select
                    value={formData.ref_from_m88}
                    onValueChange={(v) => setFormData({ ...formData, ref_from_m88: v })}
                  >
                    <SelectTrigger id="ref_from_m88">
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

            {/* Initial State is handled by backend/PBD; not shown on create form */}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/samples")}
                disabled={loading || importing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Creating..." : "Create Sample"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
