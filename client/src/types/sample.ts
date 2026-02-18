export interface Sample {
  id: string
  style_number: string
  style_name: string | null
  color: string | null
  qty: number | null
  season_id: number
  brand_id: number
  division_id: number
  category_id: number
  sample_type_id: number
  coo: string | null
  current_status: string | null
  current_stage: string | null
  created_at: string
  updated_at: string
  created_by: number
  seasons?: { name: string; year: number } | null
  brands?: { name: string } | null
  divisions?: { name: string } | null
  product_categories?: { name: string } | null
  sample_types?: { name: string; group: string } | null
}

export interface StageData {
  id?: string
  sample_id: string
  owner_id?: number | null
  created_at?: string
  updated_at?: string
  [key: string]: any
}

export interface ShippingTracking {
  id: string
  sample_id: string
  awb: string | null
  origin: string | null
  destination: string | null
  estimated_arrival: string | null
  actual_arrival: string | null
  status: string | null
  created_at: string
  updated_at: string
}

export interface SampleHistory {
  id: string
  sample_id: string
  table_name: string
  field_name: string
  old_value: string | null
  new_value: string | null
  changed_by: number
  changed_at: string
  change_notes: string | null
}

export interface StatusTransition {
  id: string
  sample_id: string
  from_status: string | null
  to_status: string | null
  stage: string | null
  transitioned_by: number
  transitioned_at: string
  notes: string | null
}

export interface SampleFull extends Sample {
  stages: {
    product_business_dev: StageData | null
    technical_design: StageData | null
    factory_execution: StageData | null
    merchandising_review: StageData | null
    costing_analysis: StageData | null
  }
  shipping: ShippingTracking[]
  history: SampleHistory[]
  status_transitions: StatusTransition[]
}

export interface CreateSampleInput {
  style_number: string
  style_name?: string
  color?: string
  qty?: number
  season_id: number
  brand_id: number
  division_id: number
  category_id: number
  sample_type_id: number
  coo?: string
  current_status?: string
  current_stage?: string
  created_by: number
}

export interface UpdateSampleInput {
  style_name?: string
  color?: string
  qty?: number
  season_id?: number
  brand_id?: number
  division_id?: number
  category_id?: number
  sample_type_id?: number
  coo?: string
  current_status?: string
  current_stage?: string
}

export interface SampleFilters {
  season_id?: number
  brand_id?: number
  division_id?: number
  category_id?: number
  sample_type_id?: number
}
