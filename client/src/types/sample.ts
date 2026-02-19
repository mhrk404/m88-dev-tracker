export interface Sample {
  sample_id: string
  style_id: number
  assignment_id: number | null
  unfree_status: string | null
  sample_type: string | null
  sample_type_group: string | null
  sample_status: string | null
  kickoff_date: string | null
  sample_due_denver: string | null
  requested_lead_time: number | null
  lead_time_type: string | null
  ref_from_m88: string | null
  ref_sample_to_fty: string | null
  additional_notes: string | null
  key_date: string | null
  current_stage: string | null
  current_status: string | null
  created_at: string
  updated_at: string
  created_by: number

  // Flattened from styles table
  brand_id: number
  season_id: number
  style_number: string
  style_name: string | null
  division: string | null
  product_category: string | null
  color: string | null
  qty: number | null
  coo: string | null

  // Legacy/Convenience fields
  id: string // maps to sample_id
  seasons?: { code?: string; name: string; year: number } | null
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
    psi: StageData | null
    sample_development: StageData | null
    pc_review: StageData | null
    costing: StageData | null
    scf: StageData | null
    shipment_to_brand: StageData | null
  }
  shipping: ShippingTracking[]
  history: SampleHistory[]
  status_transitions: StatusTransition[]
}

export interface CreateSampleInput {
  style_id?: number
  style?: {
    brand_id: number
    season_id: number
    style_number: string
    style_name?: string
    division?: string
    product_category?: string
    color?: string
    qty?: number
    coo?: string
  }
  unfree_status?: string
  sample_type?: string
  sample_type_group?: string
  sample_status?: string
  kickoff_date?: string
  sample_due_denver?: string
  requested_lead_time?: number
  lead_time_type?: string
  ref_from_m88?: string
  ref_sample_to_fty?: string
  additional_notes?: string
  key_date?: string
  current_status?: string
  current_stage?: string
  assignment?: {
    pbd_user_id?: number
    td_user_id?: number
    fty_user_id?: number
    fty_md2_user_id?: number
    md_user_id?: number
    costing_user_id?: number
  }
  created_by: number
}

export interface UpdateSampleInput {
  style_number?: string
  style_name?: string
  division?: string
  product_category?: string
  color?: string
  qty?: number
  season_id?: number
  brand_id?: number
  coo?: string
  unfree_status?: string
  sample_type?: string
  sample_type_group?: string
  sample_status?: string
  kickoff_date?: string
  sample_due_denver?: string
  requested_lead_time?: number
  lead_time_type?: string
  ref_from_m88?: string
  ref_sample_to_fty?: string
  additional_notes?: string
  key_date?: string
  current_status?: string
  current_stage?: string
  assignment?: {
    pbd_user_id?: number | null
    td_user_id?: number | null
    fty_user_id?: number | null
    fty_md2_user_id?: number | null
    md_user_id?: number | null
    costing_user_id?: number | null
  }
}

export interface SampleFilters {
  season_id?: number
  brand_id?: number
  division?: string
  product_category?: string
  sample_type?: string
  sample_status?: string
}
