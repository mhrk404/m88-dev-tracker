import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loading } from "@/components/ui/loading"
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

export default function SampleCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [importing, setImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [formData, setFormData] = useState<CreateSampleInput>({
    style_number: "",
    style_name: "",
    color: "",
    qty: undefined,
    season_id: 0,
    brand_id: 0,
    division_id: 0,
    category_id: 0,
    sample_type_id: 0,
    coo: "",
    current_status: "Pending",
    current_stage: STAGES.PRODUCT_BUSINESS_DEV,
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

    if (
      !formData.season_id ||
      !formData.brand_id ||
      !formData.division_id ||
      !formData.category_id ||
      !formData.sample_type_id
    ) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const payload: CreateSampleInput = {
        ...formData,
        style_number: formData.style_number.trim(),
        style_name: formData.style_name?.trim() || undefined,
        color: formData.color?.trim() || undefined,
        qty: formData.qty || undefined,
        coo: formData.coo?.trim() || undefined,
        current_status: formData.current_status?.trim() || "Pending",
        current_stage: formData.current_stage?.trim() || STAGES.PRODUCT_BUSINESS_DEV,
        created_by: user.id,
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

        const season_id = Number(row.season_id || row.seasonId || 0)
        const brand_id = Number(row.brand_id || row.brandId || 0)
        const division_id = Number(row.division_id || row.divisionId || 0)
        const category_id = Number(row.category_id || row.categoryId || 0)
        const sample_type_id = Number(row.sample_type_id || row.sampleTypeId || 0)

        if (!season_id || !brand_id || !division_id || !category_id || !sample_type_id) {
          failed++
          continue
        }

        const payload: CreateSampleInput = {
          style_number: style_number.trim(),
          style_name: row.style_name || row.styleName || undefined,
          color: row.color || undefined,
          qty: row.qty ? Number(row.qty) : undefined,
          season_id,
          brand_id,
          division_id,
          category_id,
          sample_type_id,
          coo: row.coo || undefined,
          current_status: (row.current_status || row.currentStatus || "Pending").trim() || "Pending",
          current_stage:
            (row.current_stage || row.currentStage || STAGES.PRODUCT_BUSINESS_DEV).trim() ||
            STAGES.PRODUCT_BUSINESS_DEV,
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
      <PageBreadcrumbs />
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
            <div className="grid gap-6 md:grid-cols-2">
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coo">COO</Label>
                <Input
                  id="coo"
                  value={formData.coo}
                  onChange={(e) => setFormData({ ...formData, coo: e.target.value })}
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
                            {season.name} {season.year}
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
                    <Label htmlFor="division_id">
                      Division <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.division_id ? formData.division_id.toString() : undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, division_id: Number(value) })
                      }
                      required
                    >
                      <SelectTrigger id="division_id">
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {lookups.divisions.map((division) => (
                          <SelectItem key={division.id} value={division.id.toString()}>
                            {division.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_id">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category_id ? formData.category_id.toString() : undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category_id: Number(value) })
                      }
                      required
                    >
                      <SelectTrigger id="category_id">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {lookups.product_categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sample_type_id">
                      Sample Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.sample_type_id ? formData.sample_type_id.toString() : undefined}
                      onValueChange={(value) =>
                        setFormData({ ...formData, sample_type_id: Number(value) })
                      }
                      required
                    >
                      <SelectTrigger id="sample_type_id">
                        <SelectValue placeholder="Select sample type" />
                      </SelectTrigger>
                      <SelectContent>
                        {lookups.sample_types.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="current_status" className="text-xs">Current Status</Label>
                <Input
                  id="current_status"
                  value={formData.current_status}
                  readOnly
                  disabled
                  className="h-8 text-sm bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current_stage" className="text-xs">Current Stage</Label>
                <Input
                  id="current_stage"
                  value={formData.current_stage}
                  readOnly
                  disabled
                  className="h-8 text-sm bg-muted cursor-not-allowed"
                />
              </div>
            </div>

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
