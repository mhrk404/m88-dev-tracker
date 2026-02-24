import apiClient from "./client"

export interface ShipmentLookupResult {
	id: string
	sample_id: string
	awb: string | null
	status: string | null
	sent_date: string | null
	data: Record<string, unknown>
}

export async function fetchShipmentByTracking(sampleId: string, trackingInput?: string): Promise<ShipmentLookupResult> {
	const q = trackingInput?.trim()
	const suffix = q ? `?awb=${encodeURIComponent(q)}` : ""
	const { data } = await apiClient.get<ShipmentLookupResult>(`/samples/${sampleId}/shipment${suffix}`)
	return data
}
