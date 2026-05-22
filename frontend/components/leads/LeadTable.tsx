"use client"

import * as React from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ExternalLink,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Sparkles,
} from "lucide-react"

import type { Lead, LeadStatus } from "@/types/lead"
import type { DraftRequest, OutreachType } from "@/types/outreach"
import { api } from "@/lib/api"
import { initials, timeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { CategoryPill } from "@/components/leads/CategoryPill"
import { ScoreBadge } from "@/components/leads/ScoreBadge"
import { StatusBadge } from "@/components/leads/StatusBadge"

const STATUS_ACTIONS: Array<{ label: string; value: LeadStatus }> = [
  { label: "Mark engaged", value: "engaged" },
  { label: "Mark contacted", value: "contacted" },
  { label: "Mark replied", value: "replied" },
  { label: "Mark qualified", value: "qualified" },
  { label: "Mark unqualified", value: "unqualified" },
  { label: "Do not contact", value: "do-not-contact" },
]

const DRAFT_ACTIONS: Array<{ label: string; outreachType: OutreachType }> = [
  { label: "Connection request", outreachType: "connection_request" },
  { label: "Direct message", outreachType: "direct_message" },
  { label: "Follow up", outreachType: "follow_up" },
]

type LeadTableProps = {
  leads: Lead[]
  total: number
  limit: number
  offset: number
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

export function LeadTable({
  leads,
  total,
  limit,
  offset,
  isLoading,
  isError,
  onRetry,
}: LeadTableProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [selected, setSelected] = React.useState<Record<string, boolean>>({})

  const updateStatus = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatus }) =>
      api.updateStatus(leadId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Status updated")
    },
    onError: (error) => {
      toast.error("Failed to update status", { description: String(error) })
    },
  })

  const generateDraft = useMutation({
    mutationFn: ({ leadId, payload }: { leadId: string; payload: DraftRequest }) =>
      api.generateDraft(leadId, payload),
    onSuccess: (data) => {
      toast.success("Draft generated", {
        description: `${data.tokens_used} tokens used`,
      })
    },
    onError: (error) => {
      toast.error("Draft failed", { description: String(error) })
    },
  })

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.min(totalPages, Math.floor(offset / limit) + 1)

  const pageNumbers = React.useMemo(() => {
    const pages: number[] = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, start + 4)
    for (let page = start; page <= end; page += 1) {
      pages.push(page)
    }
    return pages
  }, [currentPage, totalPages])

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("offset", String((page - 1) * limit))
    params.set("limit", String(limit))
    return `${pathname}?${params.toString()}`
  }

  const allSelected = leads.length > 0 && leads.every((lead) => selected[lead.id])
  const selectedCount = Object.values(selected).filter(Boolean).length

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    leads.forEach((lead) => {
      next[lead.id] = true
    })
    setSelected(next)
  }

  const toggleOne = (leadId: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [leadId]: checked }))
  }

  const exportCsv = () => {
    if (!leads.length) {
      toast.message("No leads to export")
      return
    }
    const headers = [
      "Name",
      "Company",
      "Title",
      "Category",
      "Status",
      "Score",
      "Source",
      "Location",
      "Created",
    ]
    const rows = leads.map((lead) => [
      lead.name,
      lead.company ?? "",
      lead.title ?? "",
      lead.category ?? "",
      lead.status ?? "",
      lead.ai_score ?? "",
      lead.source ?? "",
      lead.location ?? "",
      lead.created_at,
    ])
    const escapeValue = (value: string | number | null | undefined) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeValue).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isError) {
    return (
      <Empty className="border border-border bg-surface">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles className="size-4" />
          </EmptyMedia>
          <EmptyTitle>Unable to load leads</EmptyTitle>
          <EmptyDescription>Check your API connection and try again.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRetry}>Retry</Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!leads.length) {
    return (
      <Empty className="border border-border bg-surface">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles className="size-4" />
          </EmptyMedia>
          <EmptyTitle>No leads yet</EmptyTitle>
          <EmptyDescription>When new leads arrive, they will show up here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{total} leads</span>
          {selectedCount ? <Badge variant="secondary">{selectedCount} selected</Badge> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="default" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}>
            Refresh
          </Button>
        </div>
      </div>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={(value) => toggleAll(Boolean(value))} />
            </TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} data-state={selected[lead.id] ? "selected" : undefined}>
              <TableCell>
                <Checkbox
                  checked={Boolean(selected[lead.id])}
                  onCheckedChange={(value) => toggleOne(lead.id, Boolean(value))}
                />
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-[var(--accent-dim)] text-[var(--accent)]">
                      {initials(lead.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text">{lead.name}</span>
                    <span className="text-xs text-text-muted">
                      {lead.title ?? "Role"}
                      {lead.company ? ` - ${lead.company}` : ""}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <CategoryPill category={lead.category ?? undefined} />
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.status ?? undefined} />
              </TableCell>
              <TableCell>
                <ScoreBadge score={lead.ai_score} />
              </TableCell>
              <TableCell className="text-xs text-text-muted">
                {lead.source ?? "-"}
              </TableCell>
              <TableCell className="text-xs text-text-muted">
                {lead.location ?? "-"}
              </TableCell>
              <TableCell className="text-xs text-text-muted">
                {timeAgo(lead.created_at)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {lead.linkedin_url ? (
                      <DropdownMenuItem asChild>
                        <a href={lead.linkedin_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="size-4" />
                          Open LinkedIn
                        </a>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    {DRAFT_ACTIONS.map((action) => (
                      <DropdownMenuItem
                        key={action.outreachType}
                        onClick={() =>
                          generateDraft.mutate({
                            leadId: lead.id,
                            payload: { outreach_type: action.outreachType, tone: "professional" },
                          })
                        }
                      >
                        <MessageSquare className="size-4" />
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {STATUS_ACTIONS.map((action) => (
                      <DropdownMenuItem
                        key={action.value}
                        onClick={() => updateStatus.mutate({ leadId: lead.id, status: action.value })}
                      >
                        <Mail className="size-4" />
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">
          Page {currentPage} of {totalPages}
        </span>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href={buildPageHref(Math.max(1, currentPage - 1))} />
            </PaginationItem>
            {pageNumbers[0] && pageNumbers[0] > 1 ? (
              <PaginationItem>
                <PaginationLink href={buildPageHref(1)}>1</PaginationLink>
              </PaginationItem>
            ) : null}
            {pageNumbers[0] && pageNumbers[0] > 2 ? (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            ) : null}
            {pageNumbers.map((page) => (
              <PaginationItem key={page}>
                <PaginationLink href={buildPageHref(page)} isActive={page === currentPage}>
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            {pageNumbers[pageNumbers.length - 1] && pageNumbers[pageNumbers.length - 1] < totalPages - 1 ? (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            ) : null}
            {pageNumbers[pageNumbers.length - 1] && pageNumbers[pageNumbers.length - 1] < totalPages ? (
              <PaginationItem>
                <PaginationLink href={buildPageHref(totalPages)}>{totalPages}</PaginationLink>
              </PaginationItem>
            ) : null}
            <PaginationItem>
              <PaginationNext href={buildPageHref(Math.min(totalPages, currentPage + 1))} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
