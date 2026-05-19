import type { LeadStatus } from "@/types/lead"

export type OutreachType = "email" | "linkedin"

export interface DraftResponse {
  message: string
  tokens_used: number
}

export interface DraftRequest {
  outreach_type: OutreachType
}

export interface StatusUpdateRequest {
  status: LeadStatus
}
