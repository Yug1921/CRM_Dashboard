"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { m } from "framer-motion"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { wsManager } from "@/lib/websocket"
import { LeadFilters } from "@/components/leads/LeadFilters"
import { LeadTable } from "@/components/leads/LeadTable"
import { Badge } from "@/components/ui/badge"
import type { LeadCategory, LeadFilters as LeadFiltersType, LeadStatus } from "@/types/lead"

const CATEGORY_VALUES: LeadCategory[] = [
  "crypto",
  "saas",
  "real_estate",
  "ecom",
  "golf_user_org",
  "golf_brand",
  "agency",
  "media",
  "travel",
  "fitness",
]

const STATUS_VALUES: LeadStatus[] = [
  "new",
  "engaged",
  "contacted",
  "replied",
  "qualified",
  "unqualified",
  "do-not-contact",
]

const containerVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
}

function toNumber(value: string | null) {
  if (!value) {
    return undefined
  }
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export default function LeadsPage() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const filters = React.useMemo<LeadFiltersType>(() => {
    const categoryParams = searchParams
      .getAll("category")
      .filter((value) => CATEGORY_VALUES.includes(value as LeadCategory)) as LeadCategory[]

    const statusParam = searchParams.get("status")
    const status = statusParam && STATUS_VALUES.includes(statusParam as LeadStatus)
      ? (statusParam as LeadStatus)
      : undefined

    return {
      category: categoryParams.length ? categoryParams : undefined,
      status,
      source: searchParams.get("source") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      min_score: toNumber(searchParams.get("score_min")),
      max_score: toNumber(searchParams.get("score_max")),
      sort_by: searchParams.get("sort_by") ?? undefined,
      limit: toNumber(searchParams.get("limit")) ?? 50,
      offset: toNumber(searchParams.get("offset")) ?? 0,
    }
  }, [searchParams])

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["leads", filters],
    queryFn: () => api.getLeads(filters),
    placeholderData: (previous) => previous,
  })

  React.useEffect(() => {
    const baseUrl = api.baseUrl
    const wsBase = baseUrl.startsWith("https")
      ? baseUrl.replace("https", "wss")
      : baseUrl.replace("http", "ws")
    const wsUrl = `${wsBase}/ws/leads/live`

    wsManager.connect(wsUrl, (payload) => {
      if (typeof payload === "object" && payload && "event" in payload) {
        const message = payload as { event: string }
        if (message.event === "new_lead") {
          queryClient.invalidateQueries({ queryKey: ["leads"] })
          toast.message("New lead captured")
        }
      }
    })

    return () => {
      wsManager.disconnect()
    }
  }, [queryClient])

  const leads = data?.items ?? []

  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-bg"
    >
      <div className="relative overflow-hidden px-6 py-8">
        <div className="pointer-events-none absolute -left-24 -top-16 size-72 rounded-full bg-[radial-gradient(circle_at_center,var(--accent-dim),transparent_70%)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-52 w-80 bg-[radial-gradient(circle_at_top,var(--accent-dim),transparent_70%)]" />

        <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-text">Lead pipeline</div>
              <div className="text-xs text-text-muted">Live lead updates and AI scoring</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Live feed</Badge>
              {isFetching ? <Badge variant="secondary">Refreshing</Badge> : null}
            </div>
          </div>

          <LeadFilters />

          <LeadTable
            leads={leads}
            total={data?.total ?? 0}
            limit={data?.limit ?? 50}
            offset={data?.offset ?? 0}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
          />

          {/* TODO(phase-2): Add lead detail drawer, bulk actions, and saved filters. */}
        </div>
      </div>
    </m.div>
  )
}
