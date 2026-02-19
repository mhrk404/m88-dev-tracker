export interface LookupItem {
  id: number
  name: string
  [key: string]: any
}

export interface Brand extends LookupItem {
  name: string
}

export interface Season extends LookupItem {
  code: string
  year: number
  start_date?: string | null
  end_date?: string | null
}

export interface Division extends LookupItem {
  name: string
}

export interface ProductCategory extends LookupItem {
  name: string
}

export interface SampleType extends LookupItem {
  name: string
  group: string
}

export interface Role extends LookupItem {
  code: string
  name: string
}

export interface Lookups {
  brands: Brand[]
  seasons: Season[]
  divisions: Division[]
  product_categories: ProductCategory[]
  sample_types: SampleType[]
  roles: Role[]
}

export type LookupType = keyof Lookups
