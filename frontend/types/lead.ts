export type LeadCategory =
  | "crypto"
  | "saas"
  | "real_estate"
  | "ecom"
  | "golf_user_org"
  | "golf_brand"
  | "agency"
  | "media"
  | "travel"
  | "fitness"

export type LeadStatus =
  | "new"
  | "engaged"
  | "contacted"
  | "replied"
  | "qualified"
  | "unqualified"
  | "do-not-contact"

export interface Lead {
  id: string
  name: string
  company?: string | null
  title?: string | null
  headline?: string | null
  location?: string | null
  linkedin_url?: string | null
  ai_score?: number | null
  ai_outreach_template?: string | null
  ai_draft_message?: string | null
  category?: LeadCategory | null
  status?: LeadStatus | null
  source?: string | null
  created_at: string
}

export interface LeadFilters {
  limit?: number
  offset?: number
  sort_by?: string
  status?: LeadStatus
  category?: LeadCategory[]
  source?: string
  country?: string
  search?: string
  min_score?: number
  max_score?: number
}

export interface LeadsResponse {
  total: number
  items: Lead[]
  limit: number
  offset: number
}
