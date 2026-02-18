import apiClient from "./client"

function filenameFromContentDisposition(contentDisposition: string | undefined | null): string | null {
  if (!contentDisposition) return null
  // Examples:
  // attachment; filename="samples.csv"
  // attachment; filename=samples.csv
  const match = /filename\\*?=(?:UTF-8''|\"?)([^\";]+)/i.exec(contentDisposition)
  if (!match?.[1]) return null
  return decodeURIComponent(match[1].trim())
}

export async function exportSamplesCsv(params?: { season_id?: number; brand_id?: number }) {
  const res = await apiClient.get<Blob>("/export/samples", {
    params: { format: "csv", ...params },
    responseType: "blob",
  })

  const contentType = res.headers?.["content-type"] || "text/csv"
  const filename =
    filenameFromContentDisposition(res.headers?.["content-disposition"]) ||
    `samples_${new Date().toISOString().slice(0, 10)}.csv`

  const blob = new Blob([res.data], { type: contentType })
  return { blob, filename }
}

