import type { LeadStatus } from "@/types/lead"

export type OutreachType = "connection_request" | "direct_message" | "follow_up"
export type DraftTone = "professional" | "casual" | "friendly"

export interface DraftResponse {
  message: string
  tokens_used: number
}

export interface DraftRequest {
  outreach_type: OutreachType
  tone?: DraftTone
  custom_note?: string
}

export interface StatusUpdateRequest {
  status: LeadStatus
}
