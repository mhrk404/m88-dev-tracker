import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"
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
import { getSample, updateSample } from "@/api/samples"
import { getLookups } from "@/api/lookups"
import type { Sample, UpdateSampleInput } from "@/types/sample"
import type { Lookups } from "@/types/lookups"
import { toast } from "sonner"

export default function SampleEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sample, setSample] = useState<Sample | null>(null)
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [formData, setFormData] = useState<UpdateSampleInput>({})

  useEffect(() => {
    if (!id) return
    async function loadData() {
      try {
        const [sampleData, lookupsData] = await Promise.all([
          getSample(id),
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
          division_id: sampleData.division_id,
          category_id: sampleData.category_id,
          sample_type_id: sampleData.sample_type_id,
          coo: sampleData.coo || "",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return

    setLoading(true)
    try {
      const payload: UpdateSampleInput = {
        ...formData,
        style_name: formData.style_name?.trim() || undefined,
        color: formData.color?.trim() || undefined,
        qty: formData.qty || undefined,
        coo: formData.coo?.trim() || undefined,
        current_status: formData.current_status?.trim() || undefined,
        current_stage: formData.current_stage?.trim() || undefined,
      }
      await updateSample(id, payload)
      toast.success("Sample updated successfully")
      navigate(`/samples/${id}`)
    } catch (error: any) {
      console.error("Failed to update sample:", error)
      toast.error(error.response?.data?.error || "Failed to update sample")
    } finally {
      setLoading(false)
    }
  }

  if (!sample || !lookups) {
    return <Loading fullScreen text="Loading..." />
  }

  return (
    <div className="space-y-4 p-6">
      <PageBreadcrumbs />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/samples/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Sample</h1>
        <span className="text-muted-foreground">({sample.style_number})</span>
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
                <Label htmlFor="style_name" className="text-xs">Style Name</Label>
                <Input
                  id="style_name"
                  value={formData.style_name || ""}
                  onChange={(e) => setFormData({ ...formData, style_name: e.target.value })}
                  className="h-8 text-sm"
                />
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
                <Label htmlFor="season_id" className="text-xs">Season</Label>
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
                        {season.name} {season.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand_id" className="text-xs">Brand</Label>
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="division_id" className="text-xs">Division</Label>
                <Select
                  value={formData.division_id ? formData.division_id.toString() : undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, division_id: Number(value) })
                  }
                >
                  <SelectTrigger id="division_id" className="h-8 text-sm">
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

              <div className="space-y-1.5">
                <Label htmlFor="category_id" className="text-xs">Category</Label>
                <Select
                  value={formData.category_id ? formData.category_id.toString() : undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category_id: Number(value) })
                  }
                >
                  <SelectTrigger id="category_id" className="h-8 text-sm">
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

              <div className="space-y-1.5">
                <Label htmlFor="sample_type_id" className="text-xs">Sample Type</Label>
                <Select
                  value={formData.sample_type_id ? formData.sample_type_id.toString() : undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sample_type_id: Number(value) })
                  }
                >
                  <SelectTrigger id="sample_type_id" className="h-8 text-sm">
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

              <div className="space-y-1.5">
                <Label htmlFor="current_status" className="text-xs">Current Status</Label>
                <Input
                  id="current_status"
                  value={formData.current_status || ""}
                  onChange={(e) => setFormData({ ...formData, current_status: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="current_stage" className="text-xs">Current Stage</Label>
                <Input
                  id="current_stage"
                  value={formData.current_stage || ""}
                  onChange={(e) => setFormData({ ...formData, current_stage: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

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
    </div>
  )
}
