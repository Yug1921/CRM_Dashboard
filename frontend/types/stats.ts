export interface CategoryBreakdown {
  crypto: number
  saas: number
  real_estate: number
  ecom: number
  golf_user_org: number
  golf_brand: number
  agency: number
  media: number
  travel: number
  fitness: number
}

export interface TopLocation {
  location: string
  count: number
}

export interface StatsOverview {
  total_leads: number
  captured_today: number
  capture_rate_7d: number
  by_category: CategoryBreakdown
  by_status: Record<string, number>
  top_locations: TopLocation[]
  reply_rate: number
}
